using System;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows;
using System.Windows.Threading;

class NativeFlowTests {
    static void Check(bool ok, string reason) { if (!ok) throw new Exception(reason); }
    static FieldInfo Field(string name) { return typeof(SetupWindow).GetField(name, BindingFlags.NonPublic | BindingFlags.Instance); }
    [STAThread]
    static int Main(string[] args) {
        string state = args[0], kind = args[1];
        try {
            Directory.CreateDirectory(state);
            string destination = Path.Combine(state, "app");
            string backend = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "BackendFixture.exe");
            bool remove = kind == "remove";
            if (remove) { Directory.CreateDirectory(destination); File.WriteAllText(Path.Combine(destination, "Patilanci Launcher.exe"), "fixture"); }
            File.WriteAllText(Path.Combine(state, "world-sentinel.txt"), "preserve");
            File.WriteAllText(Path.Combine(state, "bootstrap.ini"), "[setup]\r\naction=" + (remove ? "uninstall" : "install") + "\r\ndirectory=" + destination + "\r\nversion=2.3.0\r\nbackend=" + backend + "\r\n", Encoding.Unicode);
            var app = new Application();
            var window = new SetupWindow(state, null, null) { Left = -10000, Top = -10000, WindowStartupLocation = WindowStartupLocation.Manual, ShowInTaskbar = false };
            var deadline = DateTime.UtcNow.AddSeconds(15);
            var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(100) };
            window.ContentRendered += delegate {
                try {
                    if (kind == "cancel") { window.Close(); return; }
                    Field("desktop").SetValue(window, false); Field("startMenu").SetValue(window, false);
                    Check((bool)Field("keepData").GetValue(window), "Uninstall must preserve data by default");
                    typeof(SetupWindow).GetMethod("Begin", BindingFlags.NonPublic | BindingFlags.Instance).Invoke(window, null);
                    Check((bool)Field("busy").GetValue(window), "Start must launch the backend");
                    window.Close(); Check(window.IsVisible, "Closing while files are changing must be blocked");
                    timer.Start();
                } catch (Exception e) { File.WriteAllText(Path.Combine(state, "flow-error.txt"), e.ToString()); Environment.Exit(1); }
            };
            timer.Tick += delegate {
                try {
                    if (DateTime.UtcNow > deadline) throw new Exception("Native backend flow timed out");
                    if ((bool)Field("busy").GetValue(window)) return;
                    string stage = (string)Field("stage").GetValue(window);
                    if (kind == "failure") Check(stage == "settings" && (string)Field("error").GetValue(window) != "", "Backend failure must return to settings with an error");
                    else Check(stage == "complete", "Completion must wait for backend success and its marker");
                    string command = File.ReadAllText(Path.Combine(state, "backend-result.txt"));
                    Check(!command.Contains("--delete-app-data"), "Default uninstall must preserve game data");
                    Check(command.Contains("/currentuser"), "Installation scope was lost");
                    string options = File.ReadAllText(Path.Combine(state, "options.ini"));
                    Check(options.Contains("desktop=0") && options.Contains("startMenu=0"), "Shortcut options were lost");
                    Check(File.ReadAllText(Path.Combine(state, "world-sentinel.txt")) == "preserve", "Game data was modified");
                    File.WriteAllText(Path.Combine(state, "flow-passed.txt"), kind);
                    timer.Stop(); window.Close();
                } catch (Exception e) { File.WriteAllText(Path.Combine(state, "flow-error.txt"), e.ToString()); Environment.Exit(1); }
            };
            app.Run(window);
            if (kind == "cancel") { Check(!File.Exists(Path.Combine(state, "backend-result.txt")), "Cancellation started a backend"); File.WriteAllText(Path.Combine(state, "flow-passed.txt"), kind); }
            Check(File.Exists(Path.Combine(state, "flow-passed.txt")), "Native flow did not complete");
            return 0;
        } catch (Exception e) { File.WriteAllText(Path.Combine(state, "flow-error.txt"), e.ToString()); return 1; }
    }
}
