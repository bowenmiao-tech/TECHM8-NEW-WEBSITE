using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;

namespace Techm8.Diagnostics
{
    internal sealed class MainForm : Form
    {
        private const int HistoryLimit = 3600;

        private readonly Sensors _sensors = new Sensors();
        private Inventory _inventory;
        private ErrorScan _errors;
        private SensorSnapshot _snap;
        private readonly List<Sample> _samples = new List<Sample>();
        private double? _maxCpuTemp, _maxGpuTemp;
        private double _maxClock;
        private string _errorFilter;
        private bool _gpuPreferenceAdded;
        private volatile bool _closing;

        // Stress state
        private CpuStress _cpuStress;
        private GpuStressForm _gpuForm;
        private DateTime _stressStart;
        private Stopwatch _tickWatch;
        private int _stressDuration;
        private readonly List<double> _scores = new List<double>();
        private readonly List<double> _fps = new List<double>();
        private readonly List<double> _clocks = new List<double>();
        private double? _baseline, _stressCpuTempStart, _stressCpuMax, _stressGpuMax, _stressPowerMax;
        private StressResult _lastStress;

        // Header
        private Label _driverLabel;
        private Button _driverButton;

        // Stress tab
        private ComboBox _duration;
        private CheckBox _useCpu, _useGpu;
        private Button _start, _stop;
        private Label _stressStatus, _stressResult;
        private Tile _tCpuTemp, _tGpuTemp, _tLoad, _tClock, _tPower, _tScore, _tThrottle, _tFps, _tTime;
        private Chart _tempChart, _loadChart;
        private ListView _sensorList;

        // Other tabs
        private ListView _overview, _disks, _volumes, _events;
        private Tile _bHealth, _bFull, _bCycles, _bNow;
        private Label _batteryDetails;
        private ComboBox _errorDays;
        private Button _errorsReload;
        private Label _stability;
        private FlowLayoutPanel _categoryBar;
        private TextBox _eventDetail;
        private TextBox _job, _customer, _notes;
        private Label _reportStatus;

        public MainForm()
        {
            Text = "TECHM8 Diagnostics";
            Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            Font = new Font("Segoe UI", 9.75f);
            AutoScaleDimensions = new SizeF(96f, 96f);
            AutoScaleMode = AutoScaleMode.Dpi;
            BackColor = Theme.Background;
            MinimumSize = new Size(980, 680);
            Size = new Size(1180, 820);
            StartPosition = FormStartPosition.CenterScreen;

            SuspendLayout();
            var tabs = _tabs = new TabControl { Dock = DockStyle.Fill, Padding = new Point(14, 6) };
            tabs.TabPages.Add(BuildStressTab());
            tabs.TabPages.Add(BuildOverviewTab());
            tabs.TabPages.Add(BuildBatteryTab());
            tabs.TabPages.Add(BuildStorageTab());
            tabs.TabPages.Add(BuildErrorsTab());
            tabs.TabPages.Add(BuildReportTab());
            Controls.Add(tabs);
            Controls.Add(BuildHeader());
            ResumeLayout(true);

            var timer = new System.Windows.Forms.Timer { Interval = 1000 };
            timer.Tick += (s, e) => Tick();
            timer.Start();
        }

        // ================================================================ layout

        private Control BuildHeader()
        {
            var panel = new Panel { Dock = DockStyle.Top, Height = 58, BackColor = Theme.Text, Padding = new Padding(16, 0, 16, 0) };
            var title = new Label { Text = "TECHM8 Diagnostics", ForeColor = Color.White, Font = new Font("Segoe UI Semibold", 15f), AutoSize = true, Location = new Point(16, 14) };
            var right = new FlowLayoutPanel { Dock = DockStyle.Right, AutoSize = true, WrapContents = false, Padding = new Padding(0, 14, 0, 0), BackColor = Theme.Text };
            _driverLabel = new Label { ForeColor = Color.FromArgb(200, 255, 249), AutoSize = true, Margin = new Padding(0, 6, 10, 0), Text = "Starting sensors\u2026" };
            _driverButton = new Button { Text = "Install CPU sensor driver", AutoSize = true, Visible = false, BackColor = Theme.Brand, ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            _driverButton.FlatAppearance.BorderSize = 0;
            _driverButton.Click += (s, e) => InstallDriver();
            right.Controls.Add(_driverLabel);
            right.Controls.Add(_driverButton);
            panel.Controls.Add(title);
            panel.Controls.Add(right);
            return panel;
        }

        private static TabPage Page(string title) => new TabPage(title) { BackColor = Theme.Background, Padding = new Padding(12) };

        private static FlowLayoutPanel Toolbar() => new FlowLayoutPanel { Dock = DockStyle.Fill, AutoSize = true, WrapContents = true, Margin = new Padding(0, 0, 0, 6) };

        private static Label Caption(string text) => new Label { Text = text, AutoSize = true, Margin = new Padding(0, 7, 4, 0), ForeColor = Theme.Muted };

        private static Button Btn(string text, EventHandler onClick, bool primary = false)
        {
            var b = new Button { Text = text, AutoSize = true, Height = 30, Margin = new Padding(4, 2, 4, 2), FlatStyle = FlatStyle.Flat };
            b.FlatAppearance.BorderColor = Theme.Brand;
            if (primary)
            {
                b.BackColor = Theme.Brand;
                b.ForeColor = Color.White;
            }
            else
            {
                b.BackColor = Color.White;
            }
            b.Click += onClick;
            return b;
        }

        private static ListView List(params string[] columns)
        {
            var lv = new ListView { Dock = DockStyle.Fill, View = View.Details, FullRowSelect = true, HeaderStyle = ColumnHeaderStyle.Nonclickable, BorderStyle = BorderStyle.FixedSingle };
            foreach (string c in columns)
            {
                string[] parts = c.Split(':');
                lv.Columns.Add(parts[0], parts.Length > 1 ? int.Parse(parts[1]) : 150);
            }
            typeof(Control).GetProperty("DoubleBuffered", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance).SetValue(lv, true);
            return lv;
        }

        private TabPage BuildStressTab()
        {
            var page = Page("Stress test");
            var grid = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 6 };
            grid.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            grid.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            grid.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            grid.RowStyles.Add(new RowStyle(SizeType.Percent, 34));
            grid.RowStyles.Add(new RowStyle(SizeType.Percent, 33));
            grid.RowStyles.Add(new RowStyle(SizeType.Percent, 33));

            var bar = Toolbar();
            _duration = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Width = 130, Margin = new Padding(0, 3, 10, 0) };
            _duration.Items.AddRange(new object[] { "1 minute", "5 minutes", "10 minutes", "15 minutes", "30 minutes", "Until stopped" });
            _duration.SelectedIndex = 2;
            _useCpu = new CheckBox { Text = "CPU", Checked = true, AutoSize = true, Margin = new Padding(4, 6, 4, 0) };
            _useGpu = new CheckBox { Text = "GPU", Checked = true, AutoSize = true, Margin = new Padding(4, 6, 10, 0) };
            _start = Btn("Start stress test", (s, e) => StartStress(), primary: true);
            _stop = Btn("Stop", (s, e) => StopStress(), primary: false);
            _stop.Enabled = false;
            _stressStatus = new Label { AutoSize = true, Margin = new Padding(12, 7, 0, 0), Font = new Font(Font, FontStyle.Bold), Text = "Idle", ForeColor = Theme.Muted };
            bar.Controls.AddRange(new Control[] { Caption("Duration"), _duration, _useCpu, _useGpu, _start, _stop, _stressStatus });

            _stressResult = new Label { AutoSize = true, MaximumSize = new Size(900, 0), Margin = new Padding(4, 0, 4, 6), Visible = false };

            var tiles = new FlowLayoutPanel { Dock = DockStyle.Fill, AutoSize = true, Margin = new Padding(0, 0, 0, 6) };
            _tCpuTemp = new Tile("CPU temp");
            _tGpuTemp = new Tile("GPU temp");
            _tLoad = new Tile("CPU load");
            _tClock = new Tile("CPU clock");
            _tPower = new Tile("CPU power");
            _tScore = new Tile("CPU score");
            _tThrottle = new Tile("Throttling");
            _tFps = new Tile("GPU FPS");
            _tTime = new Tile("Elapsed");
            tiles.Controls.AddRange(new Control[] { _tCpuTemp, _tGpuTemp, _tLoad, _tClock, _tPower, _tScore, _tThrottle, _tFps, _tTime });

            _tempChart = new Chart
            {
                Dock = DockStyle.Fill,
                Samples = _samples,
                Min = 20,
                Max = 100,
                Unit = "\u00b0",
                Empty = "Waiting for temperature readings\u2026",
                Margin = new Padding(0, 0, 0, 6),
                Series =
                {
                    new ChartSeries { Label = "CPU \u00b0C", Color = Theme.CpuTemp, Value = s => s.CpuTemp },
                    new ChartSeries { Label = "GPU \u00b0C", Color = Theme.GpuTemp, Value = s => s.GpuTemp },
                },
            };
            _loadChart = new Chart
            {
                Dock = DockStyle.Fill,
                Samples = _samples,
                Min = 0,
                Max = 100,
                Unit = "%",
                Empty = "Start the stress test to see load and throttling",
                Margin = new Padding(0, 0, 0, 6),
                Series =
                {
                    new ChartSeries { Label = "CPU load %", Color = Theme.Load, Value = s => s.CpuLoad },
                    new ChartSeries { Label = "CPU clock (% of max seen)", Color = Theme.Clock, Value = s => s.CpuClock != null && _maxClock > 0 ? s.CpuClock / _maxClock * 100 : null },
                    new ChartSeries { Label = "CPU score (% of baseline)", Color = Theme.Score, Value = s => s.Score != null && s.Baseline > 0 ? s.Score / s.Baseline * 100 : null },
                },
            };
            _sensorList = List("Hardware:260", "Sensor:220", "Reading:120");

            grid.Controls.Add(bar, 0, 0);
            grid.Controls.Add(_stressResult, 0, 1);
            grid.Controls.Add(tiles, 0, 2);
            grid.Controls.Add(_tempChart, 0, 3);
            grid.Controls.Add(_loadChart, 0, 4);
            grid.Controls.Add(_sensorList, 0, 5);
            page.Controls.Add(grid);
            return page;
        }

        private TabPage BuildOverviewTab()
        {
            var page = Page("Hardware");
            _overview = List("Item:180", "Details:820");
            _overview.ShowGroups = true;
            _overview.Items.Add(new ListViewItem(new[] { "Reading hardware\u2026", "" }));
            page.Controls.Add(_overview);
            return page;
        }

        private TabPage BuildBatteryTab()
        {
            var page = Page("Battery");
            var grid = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 3 };
            grid.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            grid.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            grid.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            var tiles = new FlowLayoutPanel { Dock = DockStyle.Fill, AutoSize = true };
            _bHealth = new Tile("Health", 200);
            _bFull = new Tile("Full charge", 200);
            _bCycles = new Tile("Charge cycles", 200);
            _bNow = new Tile("Charge now", 200);
            tiles.Controls.AddRange(new Control[] { _bHealth, _bFull, _bCycles, _bNow });
            _batteryDetails = new Label { AutoSize = true, MaximumSize = new Size(1000, 0), Margin = new Padding(4, 8, 4, 8), Text = "Reading battery\u2026" };
            var bar = Toolbar();
            bar.Controls.Add(Btn("Open full Windows battery report", (s, e) => OpenBatteryReport()));
            grid.Controls.Add(tiles, 0, 0);
            grid.Controls.Add(_batteryDetails, 0, 1);
            grid.Controls.Add(bar, 0, 2);
            page.Controls.Add(grid);
            return page;
        }

        private TabPage BuildStorageTab()
        {
            var page = Page("Storage");
            var split = new SplitContainer { Dock = DockStyle.Fill, Orientation = Orientation.Horizontal, SplitterDistance = 260 };
            _disks = List("Drive:260", "Type:110", "Size:80", "Health:90", "Temp:70", "Max temp:80", "Wear:70", "Power-on:90", "Errors:70");
            _volumes = List("Volume:120", "Label:160", "Size:100", "Free:160");
            split.Panel1.Controls.Add(_disks);
            split.Panel2.Controls.Add(_volumes);
            page.Controls.Add(split);
            return page;
        }

        private TabPage BuildErrorsTab()
        {
            var page = Page("Errors & crashes");
            var grid = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 3 };
            grid.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            grid.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            grid.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

            var bar = Toolbar();
            _errorDays = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Width = 100, Margin = new Padding(0, 3, 6, 0) };
            _errorDays.Items.AddRange(new object[] { "7 days", "30 days", "90 days" });
            _errorDays.SelectedIndex = 1;
            _errorDays.SelectedIndexChanged += (s, e) => LoadErrors();
            _errorsReload = Btn("Reload", (s, e) => LoadErrors());
            _stability = new Label { AutoSize = true, Margin = new Padding(12, 7, 0, 0), Font = new Font(Font, FontStyle.Bold) };
            bar.Controls.AddRange(new Control[]
            {
                Caption("Look back"), _errorDays, _errorsReload,
                Btn("Open Reliability Monitor", (s, e) => Launch("perfmon.exe", "/rel")),
                Btn("Open Event Viewer", (s, e) => Launch("eventvwr.msc", "")),
                _stability,
            });

            _categoryBar = new FlowLayoutPanel { Dock = DockStyle.Fill, AutoSize = true, Margin = new Padding(0, 0, 0, 6) };

            var split = new SplitContainer { Dock = DockStyle.Fill, Orientation = Orientation.Horizontal, SplitterDistance = 300 };
            _events = List("Time:150", "Type:170", "Source:230", "ID:60", "Message:520");
            _events.SelectedIndexChanged += (s, e) =>
            {
                var ev = _events.SelectedItems.Count > 0 ? _events.SelectedItems[0].Tag as LogEvent : null;
                _eventDetail.Text = ev == null ? "" : $"{ev.Time:yyyy-MM-dd HH:mm:ss}  {ev.Level}  {ev.Provider}  (Event ID {ev.Id}, {ev.Log} log)\r\n\r\n{ev.Message.Replace("\n", "\r\n")}";
            };
            _eventDetail = new TextBox { Dock = DockStyle.Fill, Multiline = true, ReadOnly = true, ScrollBars = ScrollBars.Vertical, BackColor = Color.White };
            split.Panel1.Controls.Add(_events);
            split.Panel2.Controls.Add(_eventDetail);

            grid.Controls.Add(bar, 0, 0);
            grid.Controls.Add(_categoryBar, 0, 1);
            grid.Controls.Add(split, 0, 2);
            page.Controls.Add(grid);
            return page;
        }

        private TabPage BuildReportTab()
        {
            var page = Page("Report");
            var grid = new TableLayoutPanel { Dock = DockStyle.Top, AutoSize = true, ColumnCount = 2 };
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            _job = new TextBox { Width = 300 };
            _customer = new TextBox { Width = 300 };
            _notes = new TextBox { Dock = DockStyle.Fill, Multiline = true, Height = 110, ScrollBars = ScrollBars.Vertical };
            grid.Controls.Add(Caption("Job / ticket number"), 0, 0);
            grid.Controls.Add(_job, 1, 0);
            grid.Controls.Add(Caption("Customer name"), 0, 1);
            grid.Controls.Add(_customer, 1, 1);
            grid.Controls.Add(Caption("Technician notes"), 0, 2);
            grid.Controls.Add(_notes, 1, 2);
            var bar = Toolbar();
            bar.Controls.Add(Btn("Save report (HTML)\u2026", (s, e) => SaveReport(), primary: true));
            _reportStatus = new Label { AutoSize = true, Margin = new Padding(8, 7, 0, 0), ForeColor = Theme.Muted, Text = "The report includes the specs, battery, drives, the last stress test and the error summary." };
            bar.Controls.Add(_reportStatus);
            grid.Controls.Add(bar, 1, 3);
            page.Controls.Add(grid);
            return page;
        }

        // ================================================================ startup

        // ================================================================ self test

        public string SelfTestFolder;
        private TabControl _tabs;

        private async void RunSelfTest()
        {
            Directory.CreateDirectory(SelfTestFolder);
            var log = new System.Text.StringBuilder();
            void Capture(Control c, string name)
            {
                var r = c.RectangleToScreen(c.ClientRectangle);
                using (var bmp = new Bitmap(r.Width, r.Height))
                {
                    using (var g = Graphics.FromImage(bmp)) g.CopyFromScreen(r.Location, Point.Empty, r.Size);
                    bmp.Save(Path.Combine(SelfTestFolder, name + ".png"));
                }
            }

            await Task.Delay(10000);
            _duration.SelectedIndex = 0;
            StartStress();
            await Task.Delay(8000);
            if (_gpuForm != null) Capture(_gpuForm, "gpu-window");
            await Task.Delay(30000);
            Activate();
            await Task.Delay(500);
            Capture(this, "1-stress-running");
            StopStress();
            await Task.Delay(1500);
            for (int i = 0; i < _tabs.TabCount; i++)
            {
                _tabs.SelectedIndex = i;
                await Task.Delay(700);
                Capture(this, $"{i + 2}-{_tabs.TabPages[i].Text.Replace(' ', '-').Replace("&", "and")}");
            }

            var s = _lastStress;
            log.AppendLine($"driver installed: {Sensors.PawnIoInstalled()}");
            log.AppendLine($"stress: {s.Seconds}s cpu={s.Cpu} threads={s.Threads} gpu={s.Gpu} renderer={s.GpuRenderer}");
            log.AppendLine($"  baseline={s.Baseline:F0} final={s.FinalScore:F0} throttle={s.ThrottlePct:F1}% fps={s.FpsAvg:F0}");
            log.AppendLine($"  cpuTemp start={s.CpuTempStart} max={s.CpuTempMax} approx={s.CpuTempApproximate} gpuMax={s.GpuTempMax} clock={s.ClockMin}-{s.ClockMax} power={s.CpuPowerMax}");
            log.AppendLine($"verdict: {Verdicts.Stress(s).Item3}");
            log.AppendLine($"inventory: {_inventory?.Model} cpus={_inventory?.Cpus.Count} gpus={_inventory?.Gpus.Count} mem={_inventory?.Memory.Count} disks={_inventory?.Disks.Count} batteries={_inventory?.Batteries.Count}");
            log.AppendLine($"errors: {string.Join(", ", _errors?.Counts.Select(kv => kv.Key + "=" + kv.Value) ?? new string[0])} events={_errors?.Events.Count} stability={_errors?.Stability}");
            log.AppendLine("sensors:");
            foreach (var r in _snap?.All ?? new List<SensorReading>()) log.AppendLine($"  {r.Hardware} / {r.Type} / {r.Name} = {r.Value} {r.Unit}");
            File.WriteAllText(Path.Combine(SelfTestFolder, "selftest.txt"), log.ToString());
            File.WriteAllText(Path.Combine(SelfTestFolder, "report.html"), Report.Build(_inventory, _lastStress, _errors, "SELFTEST", "", "Automated self test"));
            Close();
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            if (SelfTestFolder != null) RunSelfTest();
            PreferHighPerformanceGpu();
            new Thread(SensorLoop) { IsBackground = true, Name = "sensors" }.Start();
            Task.Run(() => Collectors.ReadInventory()).ContinueWith(t =>
            {
                _inventory = t.Exception == null ? t.Result : new Inventory();
                RenderOverview();
                RenderBattery();
                RenderStorage();
            }, TaskScheduler.FromCurrentSynchronizationContext());
            LoadErrors();
        }

        private void SensorLoop()
        {
            try
            {
                _sensors.Open();
            }
            catch (Exception ex)
            {
                BeginInvoke((Action)(() => _driverLabel.Text = "Sensors failed to start: " + ex.Message));
            }
            BeginInvoke((Action)UpdateDriverStatus);
            while (!_closing)
            {
                var started = DateTime.UtcNow;
                SensorSnapshot snap;
                try { snap = _sensors.Read(); } catch { snap = null; }
                if (snap != null && !_closing)
                {
                    try { BeginInvoke((Action)(() => OnSnapshot(snap))); } catch { return; }
                }
                int wait = 1000 - (int)(DateTime.UtcNow - started).TotalMilliseconds;
                if (wait > 0) Thread.Sleep(wait);
            }
        }

        private void UpdateDriverStatus()
        {
            bool installed = Sensors.PawnIoInstalled();
            _driverButton.Visible = !installed;
            _driverLabel.Text = installed
                ? "CPU sensor driver (PawnIO) installed"
                : "CPU temperature needs the PawnIO sensor driver \u2192";
        }

        private void InstallDriver()
        {
            var answer = MessageBox.Show(this,
                "CPU temperatures can only be read through a kernel driver.\n\n" +
                "This installs PawnIO, the signed open-source driver used by LibreHardwareMonitor, " +
                "downloaded from its official GitHub release.\n\n" +
                "When you close TECHM8 Diagnostics you will be asked whether to remove it again.\n\nInstall now?",
                "Install CPU sensor driver", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
            if (answer != DialogResult.Yes) return;

            _driverButton.Enabled = false;
            _driverLabel.Text = "Installing PawnIO\u2026";
            Task.Run(() =>
            {
                string error = PawnIoSetup.Install();
                if (error == null) _sensors.Open();
                return error;
            }).ContinueWith(t =>
            {
                _driverButton.Enabled = true;
                UpdateDriverStatus();
                if (t.Result != null) MessageBox.Show(this, t.Result, "PawnIO", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }, TaskScheduler.FromCurrentSynchronizationContext());
        }

        // On laptops with two GPUs, ask Windows to give this app the dedicated one
        // (the same setting as Settings > System > Display > Graphics). Removed on exit.
        private void PreferHighPerformanceGpu()
        {
            try
            {
                using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\DirectX\UserGpuPreferences"))
                {
                    if (key.GetValue(Application.ExecutablePath) == null)
                    {
                        key.SetValue(Application.ExecutablePath, "GpuPreference=2;");
                        _gpuPreferenceAdded = true;
                    }
                }
            }
            catch { }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (_cpuStress != null || _gpuForm != null) StopStress();
            _closing = true;
            if (_gpuPreferenceAdded)
            {
                try
                {
                    using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\DirectX\UserGpuPreferences", true))
                    {
                        key?.DeleteValue(Application.ExecutablePath, false);
                    }
                }
                catch { }
            }
            _sensors.Dispose();
            if (PawnIoSetup.InstalledThisSession &&
                MessageBox.Show(this, "Remove the PawnIO sensor driver from this computer?\n\nChoose No to keep it for next time.",
                    "TECHM8 Diagnostics", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
            {
                Cursor = Cursors.WaitCursor;
                PawnIoSetup.Uninstall();
            }
            base.OnFormClosing(e);
        }

        // ================================================================ sensors

        private void OnSnapshot(SensorSnapshot snap)
        {
            _snap = snap;
            if (snap.CpuTemp != null) _maxCpuTemp = Math.Max(_maxCpuTemp ?? 0, snap.CpuTemp.Value);
            if (snap.HottestGpuTemp != null) _maxGpuTemp = Math.Max(_maxGpuTemp ?? 0, snap.HottestGpuTemp.Value);
            if (snap.CpuClockMHz != null) _maxClock = Math.Max(_maxClock, snap.CpuClockMHz.Value);
            if (_tickWatch != null)
            {
                if (snap.CpuTemp != null) _stressCpuMax = Math.Max(_stressCpuMax ?? 0, snap.CpuTemp.Value);
                if (snap.HottestGpuTemp != null) _stressGpuMax = Math.Max(_stressGpuMax ?? 0, snap.HottestGpuTemp.Value);
                if (snap.CpuPowerW != null) _stressPowerMax = Math.Max(_stressPowerMax ?? 0, snap.CpuPowerW.Value);
                if (snap.CpuClockMHz != null) _clocks.Add(snap.CpuClockMHz.Value);
            }
            RenderSensorList(snap);
            RenderBatteryLive(snap);
        }

        private void RenderSensorList(SensorSnapshot snap)
        {
            var rows = snap.All
                .Where(r => r.Type == "Temperature" || r.Type == "Fan" || r.Type == "Power" ||
                            (r.Type == "Load" && (r.Name == "CPU Total" || r.Name == "GPU Core")))
                .ToList();
            _sensorList.BeginUpdate();
            var seen = new HashSet<string>();
            foreach (var r in rows)
            {
                string key = r.Hardware + "/" + r.Type + "/" + r.Name;
                if (!seen.Add(key)) continue;
                string value = r.Value.ToString("0.#", CultureInfo.InvariantCulture) + " " + r.Unit;
                var item = _sensorList.Items[key];
                if (item == null)
                {
                    item = new ListViewItem(new[] { r.HardwareName, r.Name, value }) { Name = key };
                    _sensorList.Items.Add(item);
                }
                else if (item.SubItems[2].Text != value)
                {
                    item.SubItems[2].Text = value;
                }
            }
            for (int i = _sensorList.Items.Count - 1; i >= 0; i--)
            {
                if (!seen.Contains(_sensorList.Items[i].Name)) _sensorList.Items.RemoveAt(i);
            }
            _sensorList.EndUpdate();
        }

        // ================================================================ stress test

        private void StartStress()
        {
            if (!_useCpu.Checked && !_useGpu.Checked) return;
            int[] seconds = { 60, 300, 600, 900, 1800, 0 };
            _stressDuration = seconds[_duration.SelectedIndex];
            _samples.Clear();
            _scores.Clear();
            _fps.Clear();
            _clocks.Clear();
            _baseline = _stressCpuMax = _stressGpuMax = _stressPowerMax = null;
            _stressCpuTempStart = _snap?.CpuTemp;
            _stressStart = DateTime.Now;
            _tickWatch = Stopwatch.StartNew();

            if (_useCpu.Checked)
            {
                _cpuStress = new CpuStress();
                _cpuStress.Start();
            }
            if (_useGpu.Checked)
            {
                _gpuForm = new GpuStressForm();
                _gpuForm.FormClosed += (s, e) =>
                {
                    // Closing the GPU window stops only the GPU part.
                    if (_gpuForm != null && _gpuForm.Error != null) MessageBox.Show(this, "GPU test could not start: " + _gpuForm.Error, "GPU test", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    _gpuRenderer = _gpuForm?.Renderer ?? _gpuRenderer;
                    _gpuForm = null;
                    if (_cpuStress == null && _tickWatch != null) StopStress();
                };
                _gpuForm.Show(this);
            }
            _start.Enabled = false;
            _stop.Enabled = true;
            _duration.Enabled = _useCpu.Enabled = _useGpu.Enabled = false;
            _stressResult.Visible = false;
            SetStatus("Running", Level.Warn);
        }

        private string _gpuRenderer = "";

        private void StopStress()
        {
            if (_tickWatch == null) return;
            int elapsed = (int)_tickWatch.Elapsed.TotalSeconds;
            _tickWatch = null;
            bool usedCpu = _cpuStress != null;
            int threads = _cpuStress?.Threads ?? 0;
            bool usedGpu = _gpuForm != null || _fps.Count > 0;
            _cpuStress?.Stop();
            _cpuStress = null;
            if (_gpuForm != null)
            {
                _gpuRenderer = _gpuForm.Renderer;
                var f = _gpuForm;
                _gpuForm = null;
                f.Close();
            }

            double? final = _scores.Count > 0 ? _scores.Skip(Math.Max(0, _scores.Count - 10)).Average() : (double?)null;
            _lastStress = new StressResult
            {
                Started = _stressStart,
                Seconds = elapsed,
                Cpu = usedCpu,
                Gpu = usedGpu,
                Threads = threads,
                Baseline = _baseline,
                FinalScore = final,
                ThrottlePct = _baseline > 0 && final != null ? Math.Max(0, (1 - final.Value / _baseline.Value) * 100) : (double?)null,
                CpuTempStart = _stressCpuTempStart,
                CpuTempMax = _stressCpuMax,
                CpuTempApproximate = _snap?.CpuTempApproximate ?? false,
                GpuTempMax = _stressGpuMax,
                CpuPowerMax = _stressPowerMax,
                ClockMin = _clocks.Count > 5 ? _clocks.Skip(5).Min() : (double?)null,
                ClockMax = _clocks.Count > 0 ? _clocks.Max() : (double?)null,
                FpsAvg = _fps.Count > 3 ? _fps.Skip(3).Average() : (double?)null,
                GpuRenderer = _gpuRenderer,
            };

            var verdict = Verdicts.Stress(_lastStress);
            SetStatus(verdict.Item2, verdict.Item1);
            _stressResult.Text = $"Result ({elapsed / 60}m {elapsed % 60}s): {verdict.Item3}";
            _stressResult.ForeColor = ColorFor(verdict.Item1);
            _stressResult.Visible = true;
            _start.Enabled = true;
            _stop.Enabled = false;
            _duration.Enabled = _useCpu.Enabled = _useGpu.Enabled = true;
        }

        private void SetStatus(string text, Level level)
        {
            _stressStatus.Text = text;
            _stressStatus.ForeColor = ColorFor(level);
        }

        private static Color ColorFor(Level level) =>
            level == Level.Ok ? Theme.Ok : level == Level.Warn ? Theme.Warn : level == Level.Bad ? Theme.Bad : Theme.Text;

        private double _lastTickSeconds;

        private void Tick()
        {
            double? score = null, fps = null;
            if (_tickWatch != null)
            {
                double now = _tickWatch.Elapsed.TotalSeconds;
                double dt = Math.Max(0.2, now - _lastTickSeconds);
                _lastTickSeconds = now;
                if (_cpuStress != null)
                {
                    score = _cpuStress.TakeMegaOps() / dt;
                    _scores.Add(score.Value);
                    // Baseline: seconds 5-30, once boost clocks have settled but before heat builds up.
                    if (_baseline == null && now >= 30 && _scores.Count > 10) _baseline = _scores.Skip(5).Take(25).Average();
                }
                if (_gpuForm != null)
                {
                    fps = _gpuForm.TakeFrames() / dt;
                    _fps.Add(fps.Value);
                }
                if (_stressDuration > 0 && now >= _stressDuration)
                {
                    StopStress();
                    return;
                }
            }
            else
            {
                _lastTickSeconds = 0;
            }

            var s = _snap;
            _samples.Add(new Sample
            {
                CpuTemp = s?.CpuTemp,
                GpuTemp = s?.HottestGpuTemp,
                CpuLoad = s?.CpuLoad,
                CpuClock = s?.CpuClockMHz,
                Score = score,
                Baseline = _baseline,
            });
            if (_samples.Count > HistoryLimit) _samples.RemoveAt(0);
            RenderTiles(score, fps);
            _tempChart.Invalidate();
            _loadChart.Invalidate();
        }

        private void RenderTiles(double? score, double? fps)
        {
            var s = _snap;
            string F(double? v, int d = 0) => Verdicts.F(v, d);
            bool approx = s?.CpuTempApproximate ?? false;
            bool driver = Sensors.PawnIoInstalled();
            _tCpuTemp.Set(s?.CpuTemp == null ? "\u2013" : $"{F(s.CpuTemp)}\u00b0C",
                s?.CpuTemp == null ? (driver ? "no CPU sensor found" : "install the sensor driver") : approx ? "ACPI zone, approximate" : $"max {F(_maxCpuTemp)}\u00b0C",
                approx ? Level.None : Verdicts.CpuTemp(s?.CpuTemp));
            _tGpuTemp.Set(s?.HottestGpuTemp == null ? "\u2013" : $"{F(s.HottestGpuTemp)}\u00b0C",
                s?.HottestGpuTemp == null ? "no GPU sensor found" : $"max {F(_maxGpuTemp)}\u00b0C", Verdicts.GpuTemp(s?.HottestGpuTemp));
            _tLoad.Set(s?.CpuLoad == null ? "\u2013" : $"{F(s.CpuLoad)}%", s?.MemoryUsedPct == null ? "" : $"RAM {F(s.MemoryUsedPct)}% used");
            _tClock.Set(s?.CpuClockMHz == null ? "\u2013" : $"{s.CpuClockMHz / 1000:F2} GHz", _maxClock > 0 ? $"peak {_maxClock / 1000:F2} GHz" : "");
            _tPower.Set(s?.CpuPowerW == null ? "\u2013" : $"{F(s.CpuPowerW)} W", s?.CpuPowerW == null ? (driver ? "not reported" : "needs sensor driver") : "package power");

            if (_tickWatch != null)
            {
                if (_cpuStress != null)
                {
                    _tScore.Set(F(score), $"{_cpuStress.Threads} threads · M ops/s");
                    double? recent = _scores.Count > 0 ? _scores.Skip(Math.Max(0, _scores.Count - 10)).Average() : (double?)null;
                    if (_baseline > 0 && recent != null)
                    {
                        double drop = Math.Max(0, (1 - recent.Value / _baseline.Value) * 100);
                        _tThrottle.Set($"{F(drop)}%", "drop vs first 30 s", Verdicts.Throttle(drop));
                    }
                    else
                    {
                        _tThrottle.Set("\u2026", "measuring baseline");
                    }
                }
                if (_gpuForm != null) _tFps.Set(F(fps), $"load level {_gpuForm.Passes}×");
                int e = (int)_tickWatch.Elapsed.TotalSeconds;
                _tTime.Set($"{e / 60}:{e % 60:D2}", _stressDuration > 0 ? $"{Math.Ceiling((_stressDuration - e) / 60.0)} min left" : "until stopped");
            }
        }

        // ================================================================ tabs

        private void RenderOverview()
        {
            var inv = _inventory;
            _overview.BeginUpdate();
            _overview.Items.Clear();
            _overview.Groups.Clear();
            ListViewGroup Group(string name) => _overview.Groups.Add(name, name);
            void Add(ListViewGroup g, string k, string v) => _overview.Items.Add(new ListViewItem(new[] { k, v ?? "" }, g));
            string D(DateTime? d) => d?.ToString("d MMM yyyy", CultureInfo.InvariantCulture) ?? "\u2013";

            var sys = Group("System");
            string model = string.Join(" ", new[] { inv.Manufacturer, inv.Model }.Where(x => x.Length > 0));
            if (model.Length == 0) model = string.Join(" ", new[] { inv.BoardMaker, inv.BoardProduct }.Where(x => x.Length > 0));
            Add(sys, "Device", model);
            if (inv.Family.Length > 0) Add(sys, "Model family", inv.Family);
            Add(sys, "Serial number", inv.Serial.Length > 0 ? inv.Serial : "\u2013");
            Add(sys, "Computer name", inv.ComputerName);
            Add(sys, "Windows", $"{inv.OsName} {inv.OsArch} (build {inv.OsBuild})");
            Add(sys, "Installed / last boot", $"{D(inv.OsInstalled)} / {inv.LastBoot?.ToString("d MMM yyyy HH:mm", CultureInfo.InvariantCulture)}");
            Add(sys, "Motherboard", $"{inv.BoardMaker} {inv.BoardProduct}");
            Add(sys, "BIOS", $"{inv.BiosVersion} ({D(inv.BiosDate)})");

            var cpu = Group("Processor");
            foreach (var c in inv.Cpus) Add(cpu, "CPU", $"{c.Name} \u00b7 {c.Cores} cores / {c.Threads} threads, base {c.BaseMHz / 1000.0:F2} GHz");

            var gpu = Group("Graphics");
            foreach (var g in inv.Gpus)
            {
                Add(gpu, "GPU", string.Join(" \u00b7 ", new[] { g.Name, g.VramGB > 0 ? $"{g.VramGB} GB" : null, $"driver {g.Driver} ({D(g.DriverDate)})", g.Resolution }.Where(x => !string.IsNullOrEmpty(x))));
            }

            var mem = Group($"Memory \u00b7 {inv.TotalRamGB:F0} GB");
            foreach (var m in inv.Memory) Add(mem, m.Slot, $"{m.SizeGB} GB {m.Type} {(m.ConfiguredMTs > 0 ? m.ConfiguredMTs : m.SpeedMTs)} MT/s (rated {m.SpeedMTs}) \u00b7 {m.Maker} {m.Part}");

            var disk = Group("Drives");
            foreach (var d in inv.Disks) Add(disk, "Drive", $"{d.Name} \u00b7 {d.SizeGB} GB \u00b7 {d.Bus} {d.Media} \u00b7 {d.Health}");

            var net = Group("Network");
            foreach (string n in inv.Network) Add(net, "Adapter", n);

            _overview.EndUpdate();
        }

        private void RenderBattery()
        {
            var bats = _inventory.Batteries;
            if (bats.Count == 0)
            {
                _batteryDetails.Text = "No battery detected. This looks like a desktop PC.";
                _bHealth.Set("\u2013", "no battery");
                return;
            }
            var b = bats[0];
            var v = Verdicts.Battery(b.HealthPct);
            _bHealth.Set(b.HealthPct == null ? "\u2013" : $"{b.HealthPct:F0}%", v.Item2, v.Item1);
            _bFull.Set($"{b.FullMWh / 1000:F1} Wh", $"design {b.DesignMWh / 1000:F1} Wh");
            _bCycles.Set(b.Cycles?.ToString() ?? "\u2013", b.Cycles == null ? "not reported by battery" : "charge cycles");
            _batteryDetails.Text = string.Join(" \u00b7 ", new[] { b.Maker, b.Name, b.Chemistry, b.Serial.Length > 0 ? "S/N " + b.Serial : null }.Where(x => !string.IsNullOrEmpty(x)))
                + (bats.Count > 1 ? $"\r\nThis computer has {bats.Count} batteries; the first is shown. The full Windows report lists all of them." : "")
                + "\r\nHealth = full charge capacity / design capacity. Under 80% the battery is noticeably worn; under 60% it should be replaced.";
        }

        private void RenderBatteryLive(SensorSnapshot snap)
        {
            if (_inventory == null || _inventory.Batteries.Count == 0 || snap.BatteryPercent == null) return;
            string note = snap.PluggedIn == true ? "plugged in" : "on battery";
            if (snap.BatteryRateW != null && snap.BatteryRateW != 0) note += $" \u00b7 {(snap.BatteryRateW > 0 ? "+" : "")}{snap.BatteryRateW:F1} W";
            _bNow.Set($"{snap.BatteryPercent:F0}%", note);
        }

        private void RenderStorage()
        {
            _disks.BeginUpdate();
            _disks.Items.Clear();
            foreach (var d in _inventory.Disks)
            {
                int errors = (d.ReadErrors ?? 0) + (d.WriteErrors ?? 0) + (d.Uncorrected ?? 0);
                var item = new ListViewItem(new[]
                {
                    d.Name, $"{d.Bus} {d.Media}", $"{d.SizeGB} GB", d.Health,
                    d.TempC != null ? $"{d.TempC}\u00b0C" : "\u2013",
                    d.TempMaxC != null ? $"{d.TempMaxC}\u00b0C" : "\u2013",
                    d.WearPct != null ? $"{d.WearPct}% used" : "\u2013",
                    d.PowerOnHours != null ? $"{d.PowerOnHours:N0} h" : "\u2013",
                    d.ReadErrors == null && d.WriteErrors == null ? "\u2013" : errors.ToString(),
                });
                if (d.Health != "Healthy" || d.WearPct >= 90) item.ForeColor = Theme.Bad;
                else if (d.WearPct >= 70) item.ForeColor = Theme.Warn;
                _disks.Items.Add(item);
            }
            _disks.EndUpdate();

            _volumes.BeginUpdate();
            _volumes.Items.Clear();
            foreach (var v in _inventory.Volumes)
            {
                double pct = v.SizeGB > 0 ? v.FreeGB / v.SizeGB * 100 : 0;
                var item = new ListViewItem(new[] { v.Letter, v.Label, $"{v.SizeGB} GB", $"{v.FreeGB} GB ({pct:F0}%)" });
                if (pct < 10) item.ForeColor = Theme.Bad;
                else if (pct < 20) item.ForeColor = Theme.Warn;
                _volumes.Items.Add(item);
            }
            _volumes.EndUpdate();
        }

        private void LoadErrors()
        {
            int days = new[] { 7, 30, 90 }[_errorDays.SelectedIndex];
            _errorsReload.Enabled = false;
            _events.Items.Clear();
            _events.Items.Add("Reading event logs\u2026");
            Task.Run(() => Collectors.ReadErrors(days)).ContinueWith(t =>
            {
                _errorsReload.Enabled = true;
                _errors = t.Exception == null ? t.Result : new ErrorScan { Days = days };
                RenderErrors();
            }, TaskScheduler.FromCurrentSynchronizationContext());
        }

        private void RenderErrors()
        {
            var scan = _errors;
            _stability.Text = scan.Stability != null ? $"Stability index {scan.Stability:F1} / 10" : "";
            _stability.ForeColor = scan.Stability >= 8 ? Theme.Ok : scan.Stability >= 5 ? Theme.Warn : Theme.Bad;

            _categoryBar.SuspendLayout();
            _categoryBar.Controls.Clear();
            foreach (var kv in ErrorScan.Categories)
            {
                int n = scan.Counts[kv.Key];
                var chip = new CheckBox
                {
                    Appearance = Appearance.Button,
                    AutoSize = true,
                    Text = $"{kv.Value[0]}  {n}",
                    Checked = _errorFilter == kv.Key,
                    FlatStyle = FlatStyle.Flat,
                    Margin = new Padding(0, 0, 6, 4),
                    BackColor = Color.White,
                    ForeColor = n > 0 && ErrorScan.IsImportant(kv.Key) ? Theme.Bad : Theme.Text,
                    Tag = kv.Key,
                };
                chip.FlatAppearance.CheckedBackColor = Color.FromArgb(200, 244, 238);
                chip.FlatAppearance.BorderColor = Theme.Brand;
                new ToolTip().SetToolTip(chip, kv.Value[1]);
                chip.Click += (s, e) =>
                {
                    string key = (string)((Control)s).Tag;
                    _errorFilter = _errorFilter == key ? null : key;
                    RenderErrors();
                };
                _categoryBar.Controls.Add(chip);
            }
            if (scan.Minidumps.Count > 0)
            {
                _categoryBar.Controls.Add(new Label
                {
                    AutoSize = true,
                    Margin = new Padding(8, 6, 0, 0),
                    ForeColor = Theme.Bad,
                    Text = $"{scan.Minidumps.Count} crash dump file(s) in C:\\Windows\\Minidump, newest {scan.Minidumps[0].LastWriteTime:d MMM yyyy HH:mm}",
                });
            }
            _categoryBar.ResumeLayout();

            _events.BeginUpdate();
            _events.Items.Clear();
            var list = scan.Events.Where(e => _errorFilter == null || e.Category == _errorFilter).ToList();
            foreach (var ev in list)
            {
                string first = ev.Message.Split('\n')[0].Trim();
                var item = new ListViewItem(new[] { ev.Time.ToString("yyyy-MM-dd HH:mm"), ErrorScan.Categories[ev.Category][0], ev.Provider, ev.Id.ToString(), first }) { Tag = ev };
                if (ErrorScan.IsImportant(ev.Category)) item.ForeColor = Theme.Bad;
                _events.Items.Add(item);
            }
            if (list.Count == 0) _events.Items.Add(new ListViewItem(new[] { "", _errorFilter == null ? $"No errors in the last {scan.Days} days" : "None in this category" }));
            _events.EndUpdate();
            _eventDetail.Text = _errorFilter != null ? ErrorScan.Categories[_errorFilter][1] : "Select an event to read the full message. Red rows are hardware-related.";
        }

        // ================================================================ actions

        private void OpenBatteryReport()
        {
            Cursor = Cursors.WaitCursor;
            Task.Run(() => Collectors.BatteryReportHtmlPath()).ContinueWith(t =>
            {
                Cursor = Cursors.Default;
                if (t.Result == null) MessageBox.Show(this, "No battery found, or Windows could not create the report.", "Battery report");
                else Launch(t.Result, "");
            }, TaskScheduler.FromCurrentSynchronizationContext());
        }

        private void SaveReport()
        {
            if (_inventory == null)
            {
                MessageBox.Show(this, "Still reading hardware, try again in a few seconds.", "Report");
                return;
            }
            string model = string.Join("_", new[] { "TECHM8-PC-Report", _job.Text.Trim(), _inventory.Model, DateTime.Now.ToString("yyyy-MM-dd") }.Where(x => x.Length > 0));
            foreach (char c in Path.GetInvalidFileNameChars()) model = model.Replace(c, '_');
            using (var dlg = new SaveFileDialog { Filter = "HTML report|*.html", FileName = model.Replace(' ', '_') + ".html", InitialDirectory = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory) })
            {
                if (dlg.ShowDialog(this) != DialogResult.OK) return;
                string html = Report.Build(_inventory, _lastStress, _errors, _job.Text.Trim(), _customer.Text.Trim(), _notes.Text.Trim());
                File.WriteAllText(dlg.FileName, html, new System.Text.UTF8Encoding(false));
                _reportStatus.Text = "Saved " + dlg.FileName;
                Launch(dlg.FileName, "");
            }
        }

        private void Launch(string file, string args)
        {
            try { Process.Start(new ProcessStartInfo(file, args) { UseShellExecute = true }); }
            catch (Exception ex) { MessageBox.Show(this, ex.Message, "TECHM8 Diagnostics"); }
        }
    }

    /// <summary>A small stat card: caption, big value and a note.</summary>
    internal sealed class Tile : Panel
    {
        private readonly Label _value, _note;

        public Tile(string caption, int width = 150)
        {
            Size = new Size(width, 78);
            Margin = new Padding(0, 0, 8, 8);
            BackColor = Color.White;
            Padding = new Padding(10, 6, 8, 6);
            var cap = new Label { Text = caption.ToUpperInvariant(), Dock = DockStyle.Top, Height = 18, ForeColor = Theme.Muted, Font = new Font("Segoe UI Semibold", 8f) };
            _value = new Label { Text = "\u2013", Dock = DockStyle.Top, Height = 30, Font = new Font("Segoe UI Semibold", 15f), ForeColor = Theme.Text };
            _note = new Label { Text = "", Dock = DockStyle.Fill, ForeColor = Theme.Muted, Font = new Font("Segoe UI", 8f), AutoEllipsis = true };
            Controls.Add(_note);
            Controls.Add(_value);
            Controls.Add(cap);
        }

        public void Set(string value, string note, Level level = Level.None)
        {
            if (_value.Text != value) _value.Text = value;
            if (_note.Text != (note ?? "")) _note.Text = note ?? "";
            Color c = level == Level.Ok ? Theme.Ok : level == Level.Warn ? Theme.Warn : level == Level.Bad ? Theme.Bad : Theme.Text;
            if (_value.ForeColor != c) _value.ForeColor = c;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            using (var pen = new Pen(Color.FromArgb(30, 7, 39, 45)))
            {
                e.Graphics.DrawRectangle(pen, 0, 0, Width - 1, Height - 1);
            }
        }
    }
}
