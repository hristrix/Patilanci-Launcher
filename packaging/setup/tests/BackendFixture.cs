using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;

// Deliberately isolated: this fixture can touch only its own state/app folder.
class BackendFixture {
    static int Main(string[] args) {
        string state = args.Single(a => a.StartsWith("--patilanci-state=", StringComparison.Ordinal)).Substring("--patilanci-state=".Length);
        state = Path.GetFullPath(state);
        if (!Path.GetFileName(Path.GetDirectoryName(state)).StartsWith("setup-flows-", StringComparison.Ordinal)) return 10;
        string expected = Path.Combine(state, "app");
        bool remove = args.Contains("--patilanci-action=uninstall");
        string marker = remove ? "_?=" : "/D=";
        string command = Environment.CommandLine;
        string actual = Path.GetFullPath(command.Substring(command.IndexOf(marker, StringComparison.Ordinal) + marker.Length));
        if (!actual.Equals(expected, StringComparison.OrdinalIgnoreCase)) return 11;
        File.WriteAllText(Path.Combine(state, "backend-result.txt"), command);
        Thread.Sleep(500);
        if (Path.GetFileName(state) == "failure") return 7;
        Directory.CreateDirectory(expected);
        string app = Path.Combine(expected, "Patilanci Launcher.exe");
        if (remove) File.Delete(app); else File.WriteAllText(app, "isolated test fixture");
        File.WriteAllText(Path.Combine(state, "progress.ini"), "[progress]\r\npercent=100\r\ncomplete=1\r\n", Encoding.Unicode);
        return 0;
    }
}
