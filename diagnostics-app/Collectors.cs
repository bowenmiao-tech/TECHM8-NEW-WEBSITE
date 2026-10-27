using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Diagnostics.Eventing.Reader;
using System.IO;
using System.Linq;
using System.Management;
using System.Web.Script.Serialization;
using System.Xml;
using Microsoft.Win32;

namespace Techm8.Diagnostics
{
    // ------------------------------------------------------------------ models

    internal sealed class Inventory
    {
        public string ComputerName, Manufacturer, Model, Family, Serial;
        public string OsName, OsBuild, OsArch;
        public DateTime? OsInstalled, LastBoot;
        public string BoardMaker, BoardProduct, BiosVersion;
        public DateTime? BiosDate;
        public double TotalRamGB;
        public List<CpuInfo> Cpus = new List<CpuInfo>();
        public List<GpuInfo> Gpus = new List<GpuInfo>();
        public List<MemoryModule> Memory = new List<MemoryModule>();
        public List<DiskInfo> Disks = new List<DiskInfo>();
        public List<VolumeInfo> Volumes = new List<VolumeInfo>();
        public List<string> Network = new List<string>();
        public List<BatteryInfo> Batteries = new List<BatteryInfo>();
    }

    internal sealed class CpuInfo { public string Name; public int Cores, Threads, BaseMHz; }
    internal sealed class GpuInfo { public string Name, Driver, Resolution; public double VramGB; public DateTime? DriverDate; }
    internal sealed class MemoryModule { public string Slot, Type, Maker, Part; public double SizeGB; public int SpeedMTs, ConfiguredMTs; }
    internal sealed class VolumeInfo { public string Letter, Label; public double SizeGB, FreeGB; }

    internal sealed class DiskInfo
    {
        public string Name, Media, Bus, Health, Status, Serial;
        public double SizeGB;
        public int? TempC, TempMaxC, WearPct, PowerOnHours, ReadErrors, WriteErrors, Uncorrected;
    }

    internal sealed class BatteryInfo
    {
        public string Name, Maker, Serial, Chemistry;
        public double DesignMWh, FullMWh;
        public int? Cycles;
        public double? HealthPct => DesignMWh > 0 ? FullMWh / DesignMWh * 100 : (double?)null;
    }

    internal sealed class LogEvent
    {
        public DateTime Time;
        public string Log, Level, Provider, Category, Message;
        public int Id;
    }

    internal sealed class ErrorScan
    {
        public int Days;
        public Dictionary<string, int> Counts = Categories.Keys.ToDictionary(k => k, k => 0);
        public List<LogEvent> Events = new List<LogEvent>();
        public List<FileInfo> Minidumps = new List<FileInfo>();
        public double? Stability;

        // Order matters: it is the order the categories are shown in.
        public static readonly Dictionary<string, string[]> Categories = new Dictionary<string, string[]>
        {
            ["bsod"] = new[] { "Blue screens", "Windows crashed and restarted (BugCheck). Often drivers, RAM or overheating." },
            ["power"] = new[] { "Unexpected shutdowns", "Power was lost or the PC was forced off (Kernel-Power 41 / 6008)." },
            ["hardware"] = new[] { "Hardware errors (WHEA)", "The CPU, memory or PCIe bus reported a hardware fault." },
            ["storage"] = new[] { "Disk errors", "Bad blocks, controller resets or file-system damage." },
            ["gpu"] = new[] { "Graphics driver resets", "The display driver stopped responding and recovered." },
            ["app"] = new[] { "App errors", "Programs that crashed or reported errors." },
            ["system"] = new[] { "Other system errors", "Services and drivers that logged an error." },
        };

        public static bool IsImportant(string category) => category != "app" && category != "system";
    }

    // ------------------------------------------------------------------ collectors

    internal static class Collectors
    {
        private static List<ManagementBaseObject> Wmi(string query, string scope = @"root\cimv2")
        {
            try
            {
                using (var searcher = new ManagementObjectSearcher(scope, query))
                {
                    return searcher.Get().Cast<ManagementBaseObject>().ToList();
                }
            }
            catch
            {
                return new List<ManagementBaseObject>();
            }
        }

        private static object Prop(ManagementBaseObject o, string name)
        {
            try { return o?[name]; } catch { return null; }
        }

        private static string Str(ManagementBaseObject o, string name) => (Prop(o, name)?.ToString() ?? "").Trim();

        private static long Long(ManagementBaseObject o, string name)
        {
            object v = Prop(o, name);
            try { return v == null ? 0 : Convert.ToInt64(v); } catch { return 0; }
        }

        private static DateTime? WmiDate(ManagementBaseObject o, string name)
        {
            string s = Str(o, name);
            if (s.Length == 0) return null;
            try { return ManagementDateTimeConverter.ToDateTime(s); } catch { return null; }
        }

        /// <summary>Text that BIOS vendors leave in unused fields.</summary>
        public static string Clean(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return "";
            string t = s.Trim();
            string[] junk = { "default string", "to be filled by o.e.m.", "system product name", "system manufacturer", "not applicable", "none", "o.e.m." };
            return junk.Contains(t.ToLowerInvariant()) ? "" : t;
        }

        public static Inventory ReadInventory()
        {
            var inv = new Inventory { ComputerName = Environment.MachineName };

            var cs = Wmi("SELECT Manufacturer, Model, TotalPhysicalMemory FROM Win32_ComputerSystem").FirstOrDefault();
            var csp = Wmi("SELECT Version FROM Win32_ComputerSystemProduct").FirstOrDefault();
            var bios = Wmi("SELECT SerialNumber, SMBIOSBIOSVersion, ReleaseDate FROM Win32_BIOS").FirstOrDefault();
            var board = Wmi("SELECT Manufacturer, Product FROM Win32_BaseBoard").FirstOrDefault();
            var os = Wmi("SELECT Caption, BuildNumber, OSArchitecture, InstallDate, LastBootUpTime FROM Win32_OperatingSystem").FirstOrDefault();

            inv.Manufacturer = Clean(Str(cs, "Manufacturer"));
            inv.Model = Clean(Str(cs, "Model"));
            inv.Family = Clean(Str(csp, "Version"));
            inv.TotalRamGB = Math.Round(Long(cs, "TotalPhysicalMemory") / 1073741824.0, 1);
            inv.Serial = Clean(Str(bios, "SerialNumber"));
            inv.BiosVersion = Str(bios, "SMBIOSBIOSVersion");
            inv.BiosDate = WmiDate(bios, "ReleaseDate");
            inv.BoardMaker = Clean(Str(board, "Manufacturer"));
            inv.BoardProduct = Clean(Str(board, "Product"));
            inv.OsName = Str(os, "Caption");
            inv.OsBuild = Str(os, "BuildNumber");
            inv.OsArch = Str(os, "OSArchitecture");
            inv.OsInstalled = WmiDate(os, "InstallDate");
            inv.LastBoot = WmiDate(os, "LastBootUpTime");

            foreach (var p in Wmi("SELECT Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed FROM Win32_Processor"))
            {
                inv.Cpus.Add(new CpuInfo
                {
                    Name = Str(p, "Name"),
                    Cores = (int)Long(p, "NumberOfCores"),
                    Threads = (int)Long(p, "NumberOfLogicalProcessors"),
                    BaseMHz = (int)Long(p, "MaxClockSpeed"),
                });
            }

            // Win32_VideoController caps AdapterRAM at 4 GB; the driver key has the real size.
            var vram = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
            try
            {
                using (var cls = Registry.LocalMachine.OpenSubKey(@"SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}"))
                {
                    foreach (string sub in cls?.GetSubKeyNames() ?? new string[0])
                    {
                        try
                        {
                            using (var k = cls.OpenSubKey(sub))
                            {
                                object size = k?.GetValue("HardwareInformation.qwMemorySize");
                                string desc = k?.GetValue("DriverDesc") as string;
                                if (desc != null && size is long l) vram[desc] = l;
                            }
                        }
                        catch { }
                    }
                }
            }
            catch { }

            foreach (var g in Wmi("SELECT Name, DriverVersion, DriverDate, AdapterRAM, CurrentHorizontalResolution, CurrentVerticalResolution, CurrentRefreshRate FROM Win32_VideoController"))
            {
                string name = Str(g, "Name");
                long bytes = vram.TryGetValue(name, out long v) ? v : Long(g, "AdapterRAM");
                long w = Long(g, "CurrentHorizontalResolution");
                inv.Gpus.Add(new GpuInfo
                {
                    Name = name,
                    Driver = Str(g, "DriverVersion"),
                    DriverDate = WmiDate(g, "DriverDate"),
                    VramGB = Math.Round(bytes / 1073741824.0, 1),
                    Resolution = w > 0 ? $"{w} x {Long(g, "CurrentVerticalResolution")} @ {Long(g, "CurrentRefreshRate")} Hz" : "",
                });
            }

            var memTypes = new Dictionary<long, string> { [20] = "DDR", [21] = "DDR2", [24] = "DDR3", [26] = "DDR4", [27] = "LPDDR", [28] = "LPDDR2", [29] = "LPDDR3", [30] = "LPDDR4", [34] = "DDR5", [35] = "LPDDR5" };
            foreach (var m in Wmi("SELECT DeviceLocator, Capacity, Speed, ConfiguredClockSpeed, Manufacturer, PartNumber, SMBIOSMemoryType FROM Win32_PhysicalMemory"))
            {
                inv.Memory.Add(new MemoryModule
                {
                    Slot = Str(m, "DeviceLocator"),
                    SizeGB = Math.Round(Long(m, "Capacity") / 1073741824.0),
                    Type = memTypes.TryGetValue(Long(m, "SMBIOSMemoryType"), out string t) ? t : "",
                    SpeedMTs = (int)Long(m, "Speed"),
                    ConfiguredMTs = (int)Long(m, "ConfiguredClockSpeed"),
                    Maker = Str(m, "Manufacturer"),
                    Part = Str(m, "PartNumber"),
                });
            }

            foreach (var d in DriveInfo.GetDrives().Where(d => d.DriveType == DriveType.Fixed && d.IsReady))
            {
                inv.Volumes.Add(new VolumeInfo
                {
                    Letter = d.Name.TrimEnd('\\'),
                    Label = d.VolumeLabel,
                    SizeGB = Math.Round(d.TotalSize / 1073741824.0),
                    FreeGB = Math.Round(d.TotalFreeSpace / 1073741824.0),
                });
            }

            foreach (var n in Wmi(@"SELECT Name, NetConnectionStatus, Speed FROM Win32_NetworkAdapter WHERE PhysicalAdapter = TRUE AND PNPDeviceID LIKE 'PCI%'"))
            {
                bool up = Long(n, "NetConnectionStatus") == 2;
                long speed = Long(n, "Speed");
                inv.Network.Add(Str(n, "Name") + (up ? $" (connected, {(speed >= 1000000000 ? speed / 1000000000.0 + " Gbps" : speed / 1000000 + " Mbps")})" : " (not connected)"));
            }

            inv.Disks = ReadDisks();
            inv.Batteries = ReadBatteries();
            return inv;
        }

        // Disk health and the reliability counters (temperature, wear, power-on
        // hours) are only exposed through the Storage cmdlets, so ask PowerShell.
        private static List<DiskInfo> ReadDisks()
        {
            const string script =
                "$ErrorActionPreference='SilentlyContinue';" +
                "ConvertTo-Json -Compress -InputObject @(Get-PhysicalDisk | ForEach-Object { $r = $_ | Get-StorageReliabilityCounter; " +
                "[pscustomobject]@{ Name=$_.FriendlyName; Media=\"$($_.MediaType)\"; Bus=\"$($_.BusType)\"; Size=$_.Size; Health=\"$($_.HealthStatus)\"; " +
                "Status=\"$($_.OperationalStatus)\"; Serial=$_.SerialNumber; Temp=$r.Temperature; TempMax=$r.TemperatureMax; Wear=$r.Wear; " +
                "Hours=$r.PowerOnHours; ReadErr=$r.ReadErrorsTotal; WriteErr=$r.WriteErrorsTotal; Uncorr=$r.ReadErrorsUncorrected } })";
            var list = new List<DiskInfo>();
            string json = RunPowerShell(script, 60000);
            if (string.IsNullOrWhiteSpace(json)) return list;
            try
            {
                var items = new JavaScriptSerializer().DeserializeObject(json) as object[];
                foreach (var o in items ?? new object[0])
                {
                    var d = o as Dictionary<string, object>;
                    if (d == null) continue;
                    int? Int(string k) => d.TryGetValue(k, out object v) && v != null ? Convert.ToInt32(v) : (int?)null;
                    string S(string k) => d.TryGetValue(k, out object v) && v != null ? v.ToString().Trim() : "";
                    var disk = new DiskInfo
                    {
                        Name = S("Name"),
                        Media = S("Media"),
                        Bus = S("Bus"),
                        Health = S("Health"),
                        Status = S("Status"),
                        Serial = S("Serial"),
                        SizeGB = d.TryGetValue("Size", out object size) && size != null ? Math.Round(Convert.ToDouble(size) / 1073741824.0) : 0,
                        TempC = Int("Temp"),
                        TempMaxC = Int("TempMax"),
                        WearPct = Int("Wear"),
                        PowerOnHours = Int("Hours"),
                        ReadErrors = Int("ReadErr"),
                        WriteErrors = Int("WriteErr"),
                        Uncorrected = Int("Uncorr"),
                    };
                    if (disk.TempC == 0) disk.TempC = null;
                    if (disk.TempMaxC == 0) disk.TempMaxC = null;
                    list.Add(disk);
                }
            }
            catch { }
            return list;
        }

        private static List<BatteryInfo> ReadBatteries()
        {
            var list = new List<BatteryInfo>();
            string path = Path.Combine(Path.GetTempPath(), "techm8-battery.xml");
            try
            {
                Run("powercfg.exe", $"/batteryreport /xml /output \"{path}\"", 30000);
                if (File.Exists(path))
                {
                    var doc = new XmlDocument();
                    doc.Load(path);
                    foreach (XmlNode b in doc.SelectNodes("//*[local-name()='Batteries']/*[local-name()='Battery']"))
                    {
                        string Child(string n) => b.SelectSingleNode($"*[local-name()='{n}']")?.InnerText?.Trim() ?? "";
                        double.TryParse(Child("DesignCapacity"), out double design);
                        double.TryParse(Child("FullChargeCapacity"), out double full);
                        list.Add(new BatteryInfo
                        {
                            Name = Child("Id"),
                            Maker = Child("Manufacturer"),
                            Serial = Child("SerialNumber"),
                            Chemistry = Child("Chemistry"),
                            DesignMWh = design,
                            FullMWh = full,
                            Cycles = int.TryParse(Child("CycleCount"), out int c) && c > 0 ? c : (int?)null,
                        });
                    }
                }
            }
            catch { }
            finally
            {
                try { File.Delete(path); } catch { }
            }
            return list;
        }

        public static string BatteryReportHtmlPath()
        {
            string path = Path.Combine(Path.GetTempPath(), "TECHM8-battery-report.html");
            Run("powercfg.exe", $"/batteryreport /output \"{path}\"", 30000);
            return File.Exists(path) ? path : null;
        }

        // ------------------------------------------------------------ event logs

        private static string Categorize(EventRecord e)
        {
            string p = e.ProviderName ?? "";
            int id = e.Id;
            if (id == 1001 && (p.Contains("WER-SystemErrorReporting") || p == "BugCheck")) return "bsod";
            if ((p == "Microsoft-Windows-Kernel-Power" && id == 41) || (p == "EventLog" && id == 6008)) return "power";
            if (p.Contains("WHEA")) return "hardware";
            string[] storage = { "disk", "Ntfs", "Microsoft-Windows-Ntfs", "stornvme", "storahci", "Microsoft-Windows-StorPort", "volmgr", "nvme" };
            if (storage.Contains(p, StringComparer.OrdinalIgnoreCase) || p.StartsWith("iaStor", StringComparison.OrdinalIgnoreCase)) return "storage";
            if ((p == "Display" && id == 4101) || p == "nvlddmkm" || p.StartsWith("amdkmd", StringComparison.OrdinalIgnoreCase) || p == "amdwddmg" || p.StartsWith("igfx", StringComparison.OrdinalIgnoreCase)) return "gpu";
            if (e.LogName == "Application") return "app";
            return "system";
        }

        private static IEnumerable<EventRecord> Query(string log, string xpath, int max)
        {
            var query = new EventLogQuery(log, PathType.LogName, xpath) { ReverseDirection = true };
            EventLogReader reader;
            try { reader = new EventLogReader(query); } catch { yield break; }
            using (reader)
            {
                for (int i = 0; i < max; i++)
                {
                    EventRecord r;
                    try { r = reader.ReadEvent(); } catch { yield break; }
                    if (r == null) yield break;
                    yield return r;
                }
            }
        }

        public static ErrorScan ReadErrors(int days)
        {
            var scan = new ErrorScan { Days = days };
            long ms = (long)TimeSpan.FromDays(days).TotalMilliseconds;
            string time = $"TimeCreated[timediff(@SystemTime) <= {ms}]";
            var records = new List<EventRecord>();
            records.AddRange(Query("System", $"*[System[(Level=1 or Level=2) and {time}]]", 1500));
            records.AddRange(Query("System", $"*[System[Provider[@Name='Microsoft-Windows-WHEA-Logger'] and {time}]]", 200));
            records.AddRange(Query("Application", $"*[System[(Level=1 or Level=2) and {time}]]", 400));

            var seen = new HashSet<string>();
            var important = new List<Tuple<EventRecord, string>>();
            var other = new List<Tuple<EventRecord, string>>();
            foreach (var r in records.OrderByDescending(r => r.TimeCreated))
            {
                if (!seen.Add(r.LogName + "|" + r.RecordId)) continue;
                string cat = Categorize(r);
                scan.Counts[cat]++;
                (ErrorScan.IsImportant(cat) ? important : other).Add(Tuple.Create(r, cat));
            }

            // Formatting messages is the slow part: every hardware-related event
            // gets text, then the newest of the rest, 400 in total.
            foreach (var pair in important.Concat(other).Take(400))
            {
                EventRecord r = pair.Item1;
                string msg;
                try { msg = r.FormatDescription() ?? ""; } catch { msg = ""; }
                if (msg.Length > 1500) msg = msg.Substring(0, 1500) + "...";
                scan.Events.Add(new LogEvent
                {
                    Time = r.TimeCreated ?? DateTime.MinValue,
                    Log = r.LogName,
                    Level = r.Level == 1 ? "Critical" : r.Level == 2 ? "Error" : "Warning",
                    Provider = r.ProviderName,
                    Id = r.Id,
                    Category = pair.Item2,
                    Message = msg.Trim(),
                });
            }
            foreach (var r in records) r.Dispose();

            try
            {
                var dir = new DirectoryInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "Minidump"));
                if (dir.Exists) scan.Minidumps = dir.GetFiles("*.dmp").OrderByDescending(f => f.LastWriteTime).ToList();
            }
            catch { }

            var rel = Wmi("SELECT SystemStabilityIndex, TimeGenerated FROM Win32_ReliabilityStabilityMetrics")
                .OrderByDescending(o => Str(o, "TimeGenerated"))
                .FirstOrDefault();
            if (rel != null) scan.Stability = Math.Round(Convert.ToDouble(Prop(rel, "SystemStabilityIndex")), 1);
            return scan;
        }

        // ------------------------------------------------------------ processes

        public static string Run(string file, string args, int timeoutMs)
        {
            try
            {
                var psi = new ProcessStartInfo(file, args)
                {
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                };
                using (var p = Process.Start(psi))
                {
                    var output = p.StandardOutput.ReadToEndAsync();
                    p.StandardError.ReadToEndAsync();
                    if (!p.WaitForExit(timeoutMs))
                    {
                        try { p.Kill(); } catch { }
                        return null;
                    }
                    return output.Result;
                }
            }
            catch
            {
                return null;
            }
        }

        private static string RunPowerShell(string script, int timeoutMs)
        {
            string encoded = Convert.ToBase64String(System.Text.Encoding.Unicode.GetBytes(script));
            return Run("powershell.exe", "-NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand " + encoded, timeoutMs);
        }
    }
}
