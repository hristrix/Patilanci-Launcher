using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Markup;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using System.Windows.Threading;
using Forms = System.Windows.Forms;

// A small native frontend. NSIS remains the installer/uninstaller engine; this
// process never copies installed files, edits the registry, or deletes game data.
public sealed class SetupWindow : Window {
    [DllImport("kernel32", CharSet = CharSet.Unicode)]
    static extern uint GetPrivateProfileString(string section, string key, string fallback, StringBuilder value, uint size, string file);
    readonly string assets, state, backend, version, mode, capture;
    readonly bool preview, uninstall;
    readonly Canvas surface = new Canvas { Width = 1448, Height = 1086, Background = Brush("#0b0d0f") };
    readonly FontFamily body, heading;
    readonly DispatcherTimer timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(200) };
    string destination, error = "", stage = "settings";
    bool desktop = true, startMenu = true, keepData = true, run = true, busy;
    int parentId;
    Process operation;
    ProgressBar progress;
    TextBlock percent, detail, selectedPath, freeSpace;
    Button primary, cancel, close;

    static Brush Brush(string color) { return (Brush)new BrushConverter().ConvertFromString(color); }
    string Read(string key, string fallback) {
        var text = new StringBuilder(8192);
        GetPrivateProfileString("setup", key, fallback, text, 8192, System.IO.Path.Combine(state, "bootstrap.ini"));
        return text.ToString();
    }
    string Status(string key, string fallback) {
        var text = new StringBuilder(1024);
        GetPrivateProfileString("progress", key, fallback, text, 1024, System.IO.Path.Combine(state, "progress.ini"));
        return text.ToString();
    }
    public SetupWindow(string directory, string previewStage, string screenshot) {
        state = directory; assets = AppDomain.CurrentDomain.BaseDirectory;
        preview = previewStage != null; capture = screenshot;
        uninstall = preview ? previewStage.StartsWith("uninstall", StringComparison.Ordinal) : Read("action", "install") == "uninstall";
        backend = Read("backend", ""); version = Read("version", typeof(SetupWindow).Assembly.GetName().Version.ToString(3)); mode = Read("mode", "currentuser");
        int.TryParse(Read("parent", "0"), out parentId);
        destination = Read("directory", System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Patilanci Launcher"));
        body = new FontFamily(new Uri(assets), "./#ManCyrl Medium, ./#Manrope Medium");
        heading = new FontFamily(new Uri(assets), "./#OswCyr SemiBold, ./#Oswald SemiBold");
        Title = uninstall ? "Премахване на Patilanci Launcher" : "Инсталиране на Patilanci Launcher";
        Width = Math.Min(1158, SystemParameters.WorkArea.Width - 40);
        Height = Math.Min(869, SystemParameters.WorkArea.Height - 40);
        WindowStyle = WindowStyle.None; ResizeMode = ResizeMode.CanMinimize;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        Background = Brushes.Transparent; AllowsTransparency = true;
        Content = new Viewbox { Stretch = Stretch.Uniform, Child = surface };
        if (capture != null) { ShowInTaskbar = false; WindowStartupLocation = WindowStartupLocation.Manual; Left = -10000; Top = -10000; }
        if (previewStage != null) {
            if (previewStage.EndsWith("progress", StringComparison.Ordinal)) stage = "progress";
            if (previewStage.EndsWith("complete", StringComparison.Ordinal)) stage = "complete";
        }
        Draw();
        MouseLeftButtonDown += delegate(object sender, MouseButtonEventArgs e) {
            if (e.OriginalSource is TextBlock || e.OriginalSource is Canvas || e.OriginalSource is Image) { try { DragMove(); } catch (InvalidOperationException) {} }
        };
        Closing += delegate(object sender, CancelEventArgs e) { if (busy) e.Cancel = true; };
        Closed += delegate { timer.Stop(); if (!preview) Cleanup(); };
        ContentRendered += delegate {
            if (!preview) File.WriteAllText(System.IO.Path.Combine(state, "ready"), "ready");
            if (capture != null) Dispatcher.BeginInvoke(DispatcherPriority.ApplicationIdle, new Action(Capture));
        };
        timer.Tick += Tick; timer.Start();
    }
    T Place<T>(T element, double x, double y, double width, double height) where T : FrameworkElement {
        Canvas.SetLeft(element, x); Canvas.SetTop(element, y); element.Width = width; element.Height = height; surface.Children.Add(element); return element;
    }
    TextBlock Text(string value, double x, double y, double width, double size, bool title = false, string color = "#b6bdcc") {
        return Place(new TextBlock { Text = value, FontFamily = title ? heading : body, FontSize = size, Foreground = Brush(color), TextWrapping = TextWrapping.Wrap, TextTrimming = TextTrimming.CharacterEllipsis }, x, y, width, size * 2.7);
    }
    void Card(double x, double y, double width, double height) {
        Place(new Border { Background = Brush("#101214"), BorderBrush = Brush("#30353e"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(12) }, x, y, width, height);
    }
    void Line(double x, double y, double width) { Place(new Border { Background = Brush("#343942") }, x, y, width, 1); }
    static BitmapImage Picture(string file) {
        var image = new BitmapImage(); image.BeginInit(); image.CacheOption = BitmapCacheOption.OnLoad; image.UriSource = new Uri(file); image.EndInit(); image.Freeze(); return image;
    }
    Button ActionButton(string label, double x, double y, double width, bool red, Action action) {
        var button = new Button { Content = label, FontFamily = red ? heading : body, FontSize = red ? 30 : 23, Foreground = Brushes.White, Background = Brush(red ? "#f53c2e" : "#101214"), BorderBrush = Brush(red ? "#ff5041" : "#505765"), BorderThickness = new Thickness(1), Cursor = Cursors.Hand };
        button.Template = (ControlTemplate)XamlReader.Parse("<ControlTemplate xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' TargetType='Button'><Border x:Name='frame' xmlns:x='http://schemas.microsoft.com/winfx/2006/xaml' Background='{TemplateBinding Background}' BorderBrush='{TemplateBinding BorderBrush}' BorderThickness='{TemplateBinding BorderThickness}' CornerRadius='7'><ContentPresenter HorizontalAlignment='Center' VerticalAlignment='Center'/></Border><ControlTemplate.Triggers><Trigger Property='IsMouseOver' Value='True'><Setter TargetName='frame' Property='Opacity' Value='0.83'/></Trigger><Trigger Property='IsKeyboardFocused' Value='True'><Setter TargetName='frame' Property='BorderBrush' Value='#fff3df'/></Trigger><Trigger Property='IsEnabled' Value='False'><Setter TargetName='frame' Property='Opacity' Value='0.4'/></Trigger></ControlTemplate.Triggers></ControlTemplate>");
        button.Click += delegate { action(); };
        System.Windows.Automation.AutomationProperties.SetName(button, label);
        return Place(button, x, y, width, 73);
    }
    void ButtonIcon(Button button, string label, string geometry, bool after) {
        var row = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        var text = new TextBlock { Text = label, FontFamily = button.FontFamily, FontSize = button.FontSize, Foreground = button.Foreground, VerticalAlignment = VerticalAlignment.Center };
        var icon = new System.Windows.Shapes.Path { Data = Geometry.Parse(geometry), Width = 28, Height = 28, Stretch = Stretch.Uniform, Stroke = button.Foreground, StrokeThickness = 2, VerticalAlignment = VerticalAlignment.Center, Margin = after ? new Thickness(24, 0, 0, 0) : new Thickness(0, 0, 18, 0) };
        if (after) { row.Children.Add(text); row.Children.Add(icon); } else { row.Children.Add(icon); row.Children.Add(text); }
        button.Content = row;
    }
    CheckBox Check(string label, double x, double y, double width, bool value, Action<bool> change) {
        var box = new CheckBox { Content = label, IsChecked = value, FontFamily = body, FontSize = 24, Foreground = Brushes.White, Cursor = Cursors.Hand, VerticalContentAlignment = VerticalAlignment.Center };
        box.Template = (ControlTemplate)XamlReader.Parse("<ControlTemplate xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' xmlns:x='http://schemas.microsoft.com/winfx/2006/xaml' TargetType='CheckBox'><StackPanel Orientation='Horizontal'><Border x:Name='square' Width='38' Height='38' Background='#141619' BorderBrush='#515866' BorderThickness='1' CornerRadius='5'><Path x:Name='tick' Data='M 9,19 L 16,26 L 29,12' Stroke='White' StrokeThickness='3' Visibility='Collapsed'/></Border><ContentPresenter Margin='22,0,0,0' VerticalAlignment='Center'/></StackPanel><ControlTemplate.Triggers><Trigger Property='IsChecked' Value='True'><Setter TargetName='square' Property='Background' Value='#f43e30'/><Setter TargetName='square' Property='BorderBrush' Value='#ff594a'/><Setter TargetName='tick' Property='Visibility' Value='Visible'/></Trigger><Trigger Property='IsKeyboardFocused' Value='True'><Setter TargetName='square' Property='BorderBrush' Value='White'/></Trigger><Trigger Property='IsEnabled' Value='False'><Setter Property='Opacity' Value='0.5'/></Trigger></ControlTemplate.Triggers></ControlTemplate>");
        box.Checked += delegate { change(true); }; box.Unchecked += delegate { change(false); };
        return Place(box, x, y, width, 48);
    }
    new void Icon(string kind, double x, double y, string color = "#c7cddb", double size = 34) {
        string geometry = kind == "folder" ? "M 2,8 L 13,8 L 17,12 L 31,12 L 31,30 L 2,30 Z M 2,8 L 2,4 L 12,4 L 16,8 L 28,8 L 28,12" : kind == "screen" ? "M 2,3 L 30,3 L 30,23 L 2,23 Z M 16,23 L 16,30 M 9,30 L 23,30" : kind == "file" ? "M 7,2 L 21,2 L 29,10 L 29,31 L 7,31 Z M 21,2 L 21,10 L 29,10" : kind == "check" ? "M 3,16 L 12,25 L 30,6" : kind == "disk" ? "M 6,3 L 26,3 L 31,18 L 31,29 L 1,29 L 1,18 Z M 1,18 L 31,18 M 8,23 L 10,23" : "M 4,3 L 29,3 L 29,30 L 4,30 Z M 10,10 L 23,10 M 10,16 L 23,16 M 10,22 L 18,22";
        Place(new System.Windows.Shapes.Path { Data = Geometry.Parse(geometry), Stroke = Brush(color), StrokeThickness = 2, Stretch = Stretch.Uniform }, x, y, size, size);
    }
    void Circle(string text, double x, double y, double size, string color, bool filled) {
        Place(new Border { Background = filled ? Brush(color) : Brushes.Transparent, BorderBrush = Brush(color), BorderThickness = new Thickness(filled ? 0 : size > 60 ? 4 : 2), CornerRadius = new CornerRadius(size / 2) }, x, y, size, size);
        if (text == "✓") { Icon("check", x + size * 0.27, y + size * 0.27, color, size * 0.46); return; }
        var label = Text(text, x, y + (size - 32) / 2 - 2, size, 28, true, filled ? "#ffffff" : color); label.TextAlignment = TextAlignment.Center;
    }
    void Steps() {
        string[] labels = uninstall ? new [] { "Потвърждение", "Премахване", "Готово" } : new [] { "Настройки", "Инсталиране", "Готово" };
        int current = stage == "settings" ? 0 : stage == "progress" ? 1 : 2;
        double[] xs = { 590, 895, 1232 };
        for (int i = 0; i < 3; i++) {
            bool done = i < current;
            Circle(done ? "✓" : "0" + (i + 1), xs[i], 308, 54, done ? "#81ec95" : i == current ? "#f84133" : "#454b56", i == current);
            Text(labels[i], xs[i] + 77, 319, i == 2 ? 100 : 195, 25, true, i == current ? "#fff3df" : "#b1b8c8");
            if (i < 2) Line(xs[i] + 224, 335, i == 0 ? 55 : 80);
        }
    }
    void Draw() {
        surface.Children.Clear();
        // Reuse only the static artwork column from the supplied reference.
        // Every control and all text on the right remain native and live.
        var scene = new CroppedBitmap(Picture(System.IO.Path.Combine(assets, "reference.png")), new Int32Rect(0, 0, 505, 1086));
        Place(new Image { Source = scene, Stretch = Stretch.Fill }, 0, 0, 505, 1086);
        Text(uninstall ? "Д Е И Н С Т А Л И Р А Н Е" : "И Н С Т А Л И Р А Н Е", 590, 104, 800, 19);
        string title = stage == "complete" ? (uninstall ? "До следващото приключение!" : "Готово за приключения!") : uninstall ? "Деинсталирай Patilanci Launcher" : stage == "progress" ? "Инсталиране на Patilanci Launcher" : "Инсталирай Patilanci Launcher";
        Fit(Text(title, 588, 139, 835, 62, true, "#fff3df"), 835);
        Fit(Text(stage == "complete" ? (uninstall ? "Patilanci Launcher е премахнат успешно." : "Patilanci Launcher е инсталиран успешно.") : uninstall ? "Launcher-ът ще бъде премахнат от този компютър." : stage == "progress" ? "Подготвяме всичко за първото стартиране." : "Подготви launcher-а и ела да играем.", 590, 225, 820, 34), 820);
        Steps();
        if (stage == "settings") { if (uninstall) Removal(); else Settings(); }
        else if (stage == "progress") Progress(); else Complete();
        Line(549, 950, 866); Text("Версия " + version, 549, 994, 300, 18);
        if (error != "") Text(error, 552, 909, 855, 18, false, "#ff8b7f");
        close = ActionButton("×", 1376, 8, 62, false, delegate { Close(); }); close.Height = 48; close.FontSize = 39; close.Background = Brushes.Transparent; close.BorderThickness = new Thickness(0); close.IsEnabled = !busy;
        var minimize = ActionButton("−", 1300, 8, 62, false, delegate { WindowState = WindowState.Minimized; }); minimize.Height = 48; minimize.FontSize = 32; minimize.Background = Brushes.Transparent; minimize.BorderThickness = new Thickness(0);
        if (stage != "complete") {
            cancel = ActionButton("Отказ", stage == "progress" ? 1209 : 950, 970, stage == "progress" ? 206 : 178, false, delegate { Close(); }); cancel.IsEnabled = !busy;
            if (stage == "settings") {
                primary = ActionButton(uninstall ? "Премахни" : "Инсталирай", 1147, 970, 268, true, Begin);
                ButtonIcon(primary, uninstall ? "Премахни" : "Инсталирай", uninstall ? "M 5,8 L 27,8 M 12,8 L 12,3 L 20,3 L 20,8 M 8,8 L 10,30 L 23,30 L 25,8 M 14,13 L 14,25 M 19,13 L 19,25" : "M 2,16 L 29,16 M 19,6 L 29,16 L 19,26", true);
            }
        } else primary = ActionButton("Завърши    →", 1147, 970, 268, true, Finish);
    }
    void Fit(TextBlock label, double width) {
        label.TextWrapping = TextWrapping.NoWrap; label.TextTrimming = TextTrimming.None;
        // Fit the complete live title rather than clipping translated text.
        var desiredWidth = label.Width; label.Width = double.NaN;
        do { label.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity)); if (label.DesiredSize.Width <= width || label.FontSize <= 26) break; label.FontSize--; } while (true);
        label.Width = desiredWidth;
    }
    void Settings() {
        Card(549, 400, 866, 510);
        Text("Папка за инсталиране", 582, 427, 700, 29, true, "#f2f1ef");
        var input = Place(new TextBox { Text = destination, FontFamily = body, FontSize = 23, Foreground = Brush("#c4cbd8"), Background = Brush("#101214"), BorderBrush = Brush("#525966"), BorderThickness = new Thickness(1), Padding = new Thickness(18, 12, 10, 8), VerticalContentAlignment = VerticalAlignment.Center }, 582, 478, 615, 60);
        input.Template = (ControlTemplate)XamlReader.Parse("<ControlTemplate xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' xmlns:x='http://schemas.microsoft.com/winfx/2006/xaml' TargetType='TextBox'><Border Background='{TemplateBinding Background}' BorderBrush='{TemplateBinding BorderBrush}' BorderThickness='{TemplateBinding BorderThickness}' CornerRadius='6'><ScrollViewer x:Name='PART_ContentHost' Margin='{TemplateBinding Padding}'/></Border></ControlTemplate>");
        System.Windows.Automation.AutomationProperties.SetName(input, "Папка за инсталиране");
        input.TextChanged += delegate { destination = input.Text; UpdateSpace(); };
        var browse = ActionButton("Избери", 1215, 478, 169, false, delegate {
            using (var picker = new Forms.FolderBrowserDialog { Description = "Избери папка за Patilanci Launcher", SelectedPath = Directory.Exists(destination) ? destination : Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) }) {
                if (picker.ShowDialog() == Forms.DialogResult.OK) input.Text = picker.SelectedPath;
            }
        }); browse.Height = 62;
        ButtonIcon(browse, "Избери", "M 2,8 L 13,8 L 17,12 L 31,12 L 31,30 L 2,30 Z M 2,8 L 2,4 L 12,4 L 16,8 L 28,8 L 28,12", false);
        Text("Модпакът се изтегля при първото стартиране.", 582, 550, 790, 22);
        Check("Създай пряк път на работния плот", 582, 609, 800, desktop, delegate(bool v) { desktop = v; });
        Check("Добави в менюто Старт", 582, 667, 800, startMenu, delegate(bool v) { startMenu = v; });
        Card(582, 752, 801, 114); Icon("folder", 617, 793); Text("Избрана папка", 689, 778, 350, 20);
        selectedPath = Text(destination, 689, 812, 350, 21); Place(new Border { Background = Brush("#707683") }, 1058, 783, 1, 58);
        selectedPath.TextWrapping = TextWrapping.NoWrap;
        Icon("disk", 1101, 794); Text("Свободно място:", 1172, 780, 210, 20); freeSpace = Text("", 1172, 810, 210, 25, true, "#f5f5f3"); UpdateSpace();
    }
    void UpdateSpace() {
        if (selectedPath != null) selectedPath.Text = destination;
        if (freeSpace == null) return;
        try { var drive = new DriveInfo(System.IO.Path.GetPathRoot(System.IO.Path.GetFullPath(destination))); freeSpace.Text = Math.Floor(drive.AvailableFreeSpace / 1073741824d).ToString(CultureInfo.InvariantCulture) + " GB"; }
        catch { freeSpace.Text = "Недостъпно"; }
    }
    void Removal() {
        Card(549, 400, 866, 460); Text("Какво ще бъде премахнато", 582, 424, 760, 30, true, "#f4f3f1");
        string[] names = { "Файловете на launcher-а", "Прекият път на работния плот", "Записът в менюто Старт" };
        string[] descriptions = { "Основните файлове и папки на приложението.", "Иконата на launcher-а ще бъде премахната.", "Приложението няма да се показва в менюто Старт." };
        for (int i = 0; i < 3; i++) {
            double y = 480 + i * 87; Card(582, y, 62, 62); Icon(i == 0 ? "folder" : i == 1 ? "screen" : "list", 597, y + 16, "#c8cfdd", 31);
            Text(names[i], 668, y + 2, 710, 24, false, "#f5f5f3"); Text(descriptions[i], 668, y + 38, 710, 21);
        }
        Line(582, 746, 800);
        TextBlock preservation = null;
        Check("Запази световете, модовете и настройките", 582, 766, 820, keepData, delegate(bool v) {
            keepData = v;
            if (preservation != null) { preservation.Text = v ? "Папката с данните на играта ще бъде запазена." : "Световете, профилите и настройките ще бъдат изтрити."; preservation.Foreground = Brush(v ? "#b6bdcc" : "#ff8b7f"); }
        });
        preservation = Text(keepData ? "Папката с данните на играта ще бъде запазена." : "Световете, профилите и настройките ще бъдат изтрити.", 646, 813, 720, 21);
        Card(549, 876, 866, 64); Text("ⓘ   Преинсталирай launcher-а по всяко време.", 582, 891, 800, 22);
    }
    void Progress() {
        Card(549, 400, 866, 521);
        Text(uninstall ? "Премахване на файловете" : "Инсталиране на файловете", 583, 428, 700, 30, true, "#f5f5f3");
        percent = Text(preview ? "68%" : "…", 1310, 428, 90, 35, true, "#f5f5f3");
        progress = Place(new ProgressBar { Minimum = 0, Maximum = 100, Value = preview ? 68 : 0, IsIndeterminate = !preview, Foreground = Brush("#ff4636"), Background = Brush("#292d35"), BorderThickness = new Thickness(0) }, 584, 487, 796, 23);
        progress.Loaded += delegate { progress.Clip = new RectangleGeometry(new Rect(0, 0, progress.ActualWidth, progress.ActualHeight), 12, 12); };
        Text(uninstall ? "Премахване на файлове…" : "Копиране на файлове…", 584, 532, 780, 24, false, "#f5f5f3");
        detail = Text(preview ? "resources\\app.asar" : "Подготовка…", 584, 568, 780, 22);
        Line(584, 614, 796);
        string[] rows = { "Файлове на launcher-а", "Пряк път на работния плот", "Меню Старт" };
        for (int i = 0; i < rows.Length; i++) {
            double y = 647 + 64 * i; Icon(i == 0 ? "file" : i == 1 ? "screen" : "list", 599, y, i == 0 ? "#ff4d3d" : "#e5e6e5", 31);
            Text(rows[i], 668, y - 2, 650, 24, false, "#f4f4f2"); Circle("", 1348, y, 29, "#4b5260", false);
            if (i < 2) Line(584, y + 45, 796);
        }
        Line(584, 838, 796); Text(uninstall ? (keepData ? "ⓘ   Данните на играта се запазват." : "ⓘ   Изтриват се и данните на играта.") : "ⓘ   Модпакът ще се изтегли при първото стартиране.", 584, 862, 800, 22);
    }
    void Complete() {
        Card(549, 400, 866, 428); Circle("✓", 930, 440, 82, "#88f59b", false);
        Text(uninstall ? "Приложението е премахнато." : "Всичко е готово.", 583, 533, 796, 43, true, "#f5f5f3").TextAlignment = TextAlignment.Center;
        Text(uninstall ? (keepData ? "Твоите светове и настройки са запазени." : "Избраните данни са премахнати.") : "Вече можеш да стартираш launcher-а.", 583, 591, 796, 28).TextAlignment = TextAlignment.Center;
        Line(583, 650, 776);
        string[] rows = uninstall ? new [] { "Файловете са премахнати", "Преките пътища са премахнати", keepData ? "Данните на играта са запазени" : "Данните на играта са премахнати" } : new [] { "Файловете са инсталирани", desktop ? "Пряк път на работния плот" : "Без пряк път на работния плот", startMenu ? "Добавен в менюто Старт" : "Без запис в менюто Старт" };
        for (int i = 0; i < rows.Length; i++) { Circle("✓", 811, 676 + 50 * i, 29, "#88f59b", false); Text(rows[i], 866, 677 + 50 * i, 500, 24, false, "#f5f5f3"); }
        if (!uninstall) { Check("Стартирай Patilanci Launcher", 557, 847, 800, run, delegate(bool v) { run = v; }); Text("При първото стартиране ще се подготви модпакът.", 624, 892, 780, 21); }
    }
    public static string BackendArguments(bool remove, bool preserve, string installMode, string directory, string stateDirectory = null) {
        string arguments = "/S /" + (installMode == "all" ? "allusers" : "currentuser");
        if (stateDirectory != null) arguments += " --patilanci-state=\"" + stateDirectory + "\" --patilanci-action=" + (remove ? "uninstall" : "install");
        // NSIS consumes the rest of the command line as the path. These must
        // remain the last argument, without shell quoting or shell execution.
        return remove ? arguments + (preserve ? "" : " --delete-app-data") + " _?=" + directory : arguments + " /D=" + directory;
    }
    public static string ValidateDestination(string value) {
        if (string.IsNullOrWhiteSpace(value) || value.IndexOfAny(new [] { '\"', '\r', '\n', '\0' }) >= 0 || !System.IO.Path.IsPathRooted(value)) throw new Exception("Избери валидна папка за инсталиране.");
        string full = System.IO.Path.GetFullPath(value).TrimEnd('\\');
        string root = System.IO.Path.GetPathRoot(full).TrimEnd('\\');
        string windows = Environment.GetFolderPath(Environment.SpecialFolder.Windows).TrimEnd('\\');
        string profile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile).TrimEnd('\\');
        if (full.Equals(root, StringComparison.OrdinalIgnoreCase) || full.Equals(profile, StringComparison.OrdinalIgnoreCase) || full.Equals(windows, StringComparison.OrdinalIgnoreCase) || full.StartsWith(windows + "\\", StringComparison.OrdinalIgnoreCase)) throw new Exception("Избери отделна папка за Patilanci Launcher.");
        if (File.Exists(full)) throw new Exception("Избери папка, а не файл.");
        if (Directory.Exists(full) && Directory.GetFileSystemEntries(full).Length > 0 && !(File.Exists(System.IO.Path.Combine(full, "Patilanci Launcher.exe")) && File.Exists(System.IO.Path.Combine(full, "Uninstall Patilanci Launcher.exe")))) throw new Exception("Избери празна папка или съществуващата папка на Patilanci Launcher.");
        return full;
    }
    void Begin() {
        if (preview) { stage = "progress"; Draw(); return; }
        try {
            if (parentId != 0) { try { if (!Process.GetProcessById(parentId).HasExited) throw new Exception("Изчакай подготовката на инсталатора."); } catch (ArgumentException) {} }
            if (!uninstall) destination = ValidateDestination(destination);
            foreach (var process in Process.GetProcessesByName("Patilanci Launcher")) {
                using (process) { if (!process.HasExited) throw new Exception("Затвори Patilanci Launcher и Minecraft, преди да продължиш."); }
            }
            if (uninstall && !keepData && MessageBox.Show(this, "Световете, модовете, профилите и настройките ще бъдат изтрити. Да продължа ли?", "Потвърди изтриването на данните", MessageBoxButton.YesNo, MessageBoxImage.Warning) != MessageBoxResult.Yes) return;
            if (!File.Exists(backend)) throw new Exception("Инсталаторът не е намерен. Отвори го отново.");
            File.WriteAllText(System.IO.Path.Combine(state, "options.ini"), "[setup]\r\ndesktop=" + (desktop ? "1" : "0") + "\r\nstartMenu=" + (startMenu ? "1" : "0") + "\r\n");
            File.Delete(System.IO.Path.Combine(state, "progress.ini"));
            string arguments = BackendArguments(uninstall, keepData, mode, destination, state);
            var start = new ProcessStartInfo(backend, arguments) { UseShellExecute = mode == "all", CreateNoWindow = true, WorkingDirectory = state };
            // Keep the visible UI at the user's integrity level. Only the real
            // backend requests elevation for an existing all-users install.
            if (mode == "all") start.Verb = "runas";
            operation = Process.Start(start); busy = true; error = ""; stage = "progress"; Draw();
        } catch (Exception e) { error = e.Message; Draw(); }
    }
    void Tick(object sender, EventArgs e) {
        if (!busy || operation == null) return;
        try {
            int measured;
            if (int.TryParse(Status("percent", ""), out measured)) { progress.IsIndeterminate = false; progress.Value = Math.Max(0, Math.Min(100, measured)); percent.Text = measured + "%"; }
            detail.Text = Status("detail", uninstall ? "Премахване на приложението…" : "resources\\app.asar");
            if (!operation.HasExited) return;
            bool ok = operation.ExitCode == 0 && Status("complete", "0") == "1";
            bool present = File.Exists(System.IO.Path.Combine(destination, "Patilanci Launcher.exe"));
            ok = ok && (uninstall ? !present : present);
            busy = false; operation.Dispose(); operation = null;
            if (ok) stage = "complete";
            else { stage = "settings"; error = "Операцията не завърши. Провери папката и правата за достъп, след което опитай отново."; }
            Draw();
        } catch (Exception ex) { busy = false; error = ex.Message; stage = "settings"; Draw(); }
    }
    void Finish() {
        if (!preview && !uninstall && run) {
            try { Process.Start(new ProcessStartInfo(System.IO.Path.Combine(destination, "Patilanci Launcher.exe")) { UseShellExecute = true, WorkingDirectory = destination }); }
            catch (Exception e) { error = e.Message; Draw(); return; }
        }
        Close();
    }
    void Capture() {
        var drawing = new DrawingVisual();
        using (var context = drawing.RenderOpen()) context.DrawRectangle(new VisualBrush(surface), null, new Rect(0, 0, 1448, 1086));
        var bitmap = new RenderTargetBitmap(1448, 1086, 96, 96, PixelFormats.Pbgra32); bitmap.Render(drawing);
        var png = new PngBitmapEncoder(); png.Frames.Add(BitmapFrame.Create(bitmap));
        using (var stream = File.Create(capture)) png.Save(stream);
        Close();
    }
    void Cleanup() {
        // Only remove known frontend files from our bootstrap directory. The
        // running executable is left to Windows temp cleanup if still locked.
        foreach (string name in new [] { "bootstrap.ini", "options.ini", "progress.ini", "ready", "BackendUninstall.exe", "brand.png", "reference.png", "oswald-latin.ttf", "oswald-cyrillic.ttf", "manrope-latin.ttf", "manrope-cyrillic.ttf", "oswald-LICENSE.txt", "manrope-LICENSE.txt" }) {
            try { File.Delete(System.IO.Path.Combine(state, name)); } catch (IOException) {} catch (UnauthorizedAccessException) {}
        }
        try { File.Delete(System.IO.Path.Combine(state, "PatilanciSetup.exe")); Directory.Delete(state); } catch (IOException) {} catch (UnauthorizedAccessException) {}
    }
    [STAThread]
    public static int Main(string[] args) {
        try {
            if (args.Length > 1 && args[0] == "--test-model") { TestModel(args[1]); return 0; }
            string directory = args.Length > 0 && args[0] != "--preview" ? System.IO.Path.GetFullPath(args[0]) : AppDomain.CurrentDomain.BaseDirectory;
            string screen = args.Length > 1 && args[0] == "--preview" ? args[1] : null;
            string capture = args.Length > 2 && args[0] == "--preview" ? args[2] : null;
            if (screen == null && !File.Exists(System.IO.Path.Combine(directory, "bootstrap.ini"))) return 2;
            var app = new Application(); app.Run(new SetupWindow(directory, screen, capture)); return 0;
        } catch (Exception e) {
            if (args.Length > 2 && args[0] == "--preview") File.WriteAllText(args[2] + ".error.txt", e.ToString());
            else if (args.Length > 1 && args[0] == "--test-model") File.WriteAllText(System.IO.Path.Combine(args[1], "model-error.txt"), e.ToString());
            else MessageBox.Show(e.ToString(), "Patilanci Setup", MessageBoxButton.OK, MessageBoxImage.Error);
            return 1;
        }
    }
    static void TestModel(string fixture) {
        Action<bool> check = delegate(bool ok) { if (!ok) throw new Exception("Setup model regression"); };
        foreach (string forbidden in new [] { System.IO.Path.GetPathRoot(fixture), Environment.GetFolderPath(Environment.SpecialFolder.Windows), Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "relative-path", "C:\\bad\"path", "C:\\bad\npath" }) {
            bool rejected = false; try { ValidateDestination(forbidden); } catch { rejected = true; } check(rejected);
        }
        string shared = System.IO.Path.Combine(fixture, "shared"); Directory.CreateDirectory(shared); File.WriteAllText(System.IO.Path.Combine(shared, "personal.txt"), "preserve");
        bool blocked = false; try { ValidateDestination(shared); } catch { blocked = true; } check(blocked);
        string own = System.IO.Path.Combine(fixture, "Нов Launcher"); Directory.CreateDirectory(own);
        check(ValidateDestination(own) == own);
        File.WriteAllText(System.IO.Path.Combine(own, "Patilanci Launcher.exe"), "fixture");
        File.WriteAllText(System.IO.Path.Combine(own, "Uninstall Patilanci Launcher.exe"), "fixture"); check(ValidateDestination(own) == own);
        check(BackendArguments(false, true, "currentuser", own).EndsWith(" /D=" + own, StringComparison.Ordinal));
        check(!BackendArguments(true, true, "currentuser", own).Contains("--delete-app-data"));
        check(BackendArguments(true, false, "all", own) == "/S /allusers --delete-app-data _?=" + own);
        check(File.ReadAllText(System.IO.Path.Combine(shared, "personal.txt")) == "preserve");
    }
}
