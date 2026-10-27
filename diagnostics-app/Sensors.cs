using System;
using System.Collections.Generic;
using System.Linq;
using System.Management;
using LibreHardwareMonitor.Hardware;
using Microsoft.Win32;

namespace Techm8.Diagnostics
{
    internal sealed class SensorReading
    {
        public string Hardware, Name, Type, Unit;
        public double Value;

        public string HardwareName => Hardware.Substring(Hardware.IndexOf('|') + 1);
    }

    internal sealed class GpuReading
    {
        public string Name;
        public double? Temp, HotSpot, Load, PowerW, ClockMHz;
    }

    internal sealed class SensorSnapshot
    {
        public double? CpuTemp;
        public string CpuTempSource = "";
        public bool CpuTempApproximate;
        public double? CpuLoad, CpuClockMHz, CpuPowerW, MemoryUsedPct;
        public List<GpuReading> Gpus = new List<GpuReading>();
        public double? BatteryPercent, BatteryRateW, BatteryVoltage;
        public bool? PluggedIn;
        public List<SensorReading> All = new List<SensorReading>();

        public double? HottestGpuTemp => Gpus.Where(g => g.Temp != null).Select(g => g.Temp).DefaultIfEmpty(null).Max();
    }

    /// <summary>
    /// Wraps LibreHardwareMonitor. CPU temperatures need its PawnIO driver; GPU,
    /// drive and battery sensors work without it.
    /// </summary>
    internal sealed class Sensors : IDisposable
    {
        private Computer _computer;
        private readonly object _lock = new object();
        private int _baseMHz;

        public static bool PawnIoInstalled()
        {
            using (var key = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Services\PawnIO"))
            {
                return key != null;
            }
        }

        public void Open()
        {
            lock (_lock)
            {
                _computer?.Close();
                _computer = new Computer
                {
                    IsCpuEnabled = true,
                    IsGpuEnabled = true,
                    IsMotherboardEnabled = true,
                    IsStorageEnabled = true,
                    IsBatteryEnabled = true,
                    IsMemoryEnabled = true,
                };
                _computer.Open();
            }
            var p = QueryFirst("SELECT MaxClockSpeed FROM Win32_Processor");
            if (p != null) _baseMHz = Convert.ToInt32(p["MaxClockSpeed"]);
        }

        public SensorSnapshot Read()
        {
            var snap = new SensorSnapshot();
            lock (_lock)
            {
                if (_computer == null) return snap;
                foreach (IHardware hw in _computer.Hardware) Collect(hw, snap);
            }

            PickCpu(snap);
            PickGpus(snap);
            PickBattery(snap);
            AddPerformanceCounters(snap);
            return snap;
        }

        private static void Collect(IHardware hw, SensorSnapshot snap)
        {
            try { hw.Update(); } catch { return; }
            foreach (ISensor s in hw.Sensors)
            {
                if (s.Value == null || float.IsNaN(s.Value.Value)) continue;
                // Without the PawnIO driver, CPU power and some temperatures read as 0.
                if ((s.SensorType == SensorType.Power || s.SensorType == SensorType.Temperature) && s.Value.Value <= 0) continue;
                snap.All.Add(new SensorReading
                {
                    // "<HardwareType>|<name>" so readings can be picked by type.
                    Hardware = hw.HardwareType + "|" + hw.Name,
                    Name = s.Name,
                    Type = s.SensorType.ToString(),
                    Unit = UnitFor(s.SensorType),
                    Value = Math.Round(s.Value.Value, 1),
                });
            }
            foreach (IHardware sub in hw.SubHardware) Collect(sub, snap);
        }

        private static string UnitFor(SensorType t)
        {
            switch (t)
            {
                case SensorType.Temperature: return "°C";
                case SensorType.Fan: return "RPM";
                case SensorType.Load:
                case SensorType.Level:
                case SensorType.Control: return "%";
                case SensorType.Clock: return "MHz";
                case SensorType.Power: return "W";
                case SensorType.Voltage: return "V";
                case SensorType.Current: return "A";
                case SensorType.Energy: return "mWh";
                case SensorType.Data: return "GB";
                case SensorType.SmallData: return "MB";
                case SensorType.Throughput: return "B/s";
                default: return "";
            }
        }

        private static bool Is(SensorReading r, string hwType) => r.Hardware.StartsWith(hwType, StringComparison.OrdinalIgnoreCase);

        private static void PickCpu(SensorSnapshot snap)
        {
            string[] preferred = { "CPU Package", "Core (Tctl/Tdie)", "Core (Tctl)", "Core Max", "Core Average", "CPU Core" };
            var cpuTemps = snap.All.Where(r => Is(r, "Cpu") && r.Type == "Temperature" && r.Value > 0).ToList();
            foreach (string name in preferred)
            {
                var hit = cpuTemps.FirstOrDefault(r => r.Name == name);
                if (hit != null)
                {
                    snap.CpuTemp = hit.Value;
                    snap.CpuTempSource = hit.Name;
                    break;
                }
            }
            if (snap.CpuTemp == null && cpuTemps.Count > 0)
            {
                var max = cpuTemps.OrderByDescending(r => r.Value).First();
                snap.CpuTemp = max.Value;
                snap.CpuTempSource = max.Name;
            }

            var load = snap.All.FirstOrDefault(r => Is(r, "Cpu") && r.Type == "Load" && r.Name == "CPU Total");
            if (load != null) snap.CpuLoad = load.Value;
            var power = snap.All.FirstOrDefault(r => Is(r, "Cpu") && r.Type == "Power" && r.Name.StartsWith("CPU Package"));
            if (power != null) snap.CpuPowerW = power.Value;
            var mem = snap.All.FirstOrDefault(r => Is(r, "Memory") && r.Type == "Load" && r.Name == "Memory");
            if (mem != null) snap.MemoryUsedPct = mem.Value;
        }

        private static void PickGpus(SensorSnapshot snap)
        {
            foreach (var group in snap.All.Where(r => Is(r, "Gpu")).GroupBy(r => r.Hardware))
            {
                SensorReading Find(string type, params string[] names) =>
                    names.Select(n => group.FirstOrDefault(r => r.Type == type && r.Name == n)).FirstOrDefault(r => r != null);
                var g = new GpuReading { Name = group.Key.Substring(group.Key.IndexOf('|') + 1) };
                g.Temp = Find("Temperature", "GPU Core", "GPU")?.Value ?? group.Where(r => r.Type == "Temperature").Select(r => (double?)r.Value).FirstOrDefault();
                g.HotSpot = Find("Temperature", "GPU Hot Spot")?.Value;
                g.Load = Find("Load", "GPU Core", "D3D 3D")?.Value;
                g.PowerW = Find("Power", "GPU Package", "GPU Power", "GPU Core")?.Value;
                g.ClockMHz = Find("Clock", "GPU Core")?.Value;
                snap.Gpus.Add(g);
            }
        }

        private static void PickBattery(SensorSnapshot snap)
        {
            var bat = snap.All.Where(r => Is(r, "Battery")).ToList();
            if (bat.Count == 0) return;
            snap.BatteryPercent = bat.FirstOrDefault(r => r.Type == "Level" && r.Name == "Charge Level")?.Value;
            snap.BatteryVoltage = bat.FirstOrDefault(r => r.Type == "Voltage")?.Value;
            var charge = bat.FirstOrDefault(r => r.Type == "Power" && r.Name.StartsWith("Charge"));
            var discharge = bat.FirstOrDefault(r => r.Type == "Power" && r.Name.StartsWith("Discharge"));
            if (charge != null && charge.Value > 0) snap.BatteryRateW = charge.Value;
            else if (discharge != null && discharge.Value > 0) snap.BatteryRateW = -discharge.Value;
            snap.PluggedIn = System.Windows.Forms.SystemInformation.PowerStatus.PowerLineStatus == System.Windows.Forms.PowerLineStatus.Online;
        }

        // Effective clock the way Task Manager shows it, plus ACPI thermal zones as a
        // last-resort CPU temperature when the PawnIO driver is not installed.
        private void AddPerformanceCounters(SensorSnapshot snap)
        {
            var pi = QueryFirst("SELECT PercentProcessorPerformance, PercentProcessorUtility, PercentProcessorTime FROM Win32_PerfFormattedData_Counters_ProcessorInformation WHERE Name = '_Total'");
            if (pi != null)
            {
                double perf = Convert.ToDouble(pi["PercentProcessorPerformance"]);
                if (_baseMHz > 0 && perf > 0) snap.CpuClockMHz = Math.Round(_baseMHz * perf / 100);
                if (snap.CpuLoad == null)
                {
                    object util = SafeProp(pi, "PercentProcessorUtility") ?? SafeProp(pi, "PercentProcessorTime");
                    if (util != null) snap.CpuLoad = Math.Min(100, Convert.ToDouble(util));
                }
            }

            if (snap.CpuTemp == null)
            {
                double best = 0;
                foreach (ManagementBaseObject z in Query("SELECT Name, HighPrecisionTemperature, Temperature FROM Win32_PerfFormattedData_Counters_ThermalZoneInformation"))
                {
                    double hp = Convert.ToDouble(SafeProp(z, "HighPrecisionTemperature") ?? 0);
                    double c = hp > 0 ? hp / 10 - 273.15 : Convert.ToDouble(SafeProp(z, "Temperature") ?? 0) - 273.15;
                    if (c > 1 && c < 125)
                    {
                        snap.All.Add(new SensorReading { Hardware = "Acpi|ACPI thermal zone", Name = z["Name"]?.ToString(), Type = "Temperature", Unit = "°C", Value = Math.Round(c, 1) });
                        best = Math.Max(best, c);
                    }
                }
                if (best > 0)
                {
                    snap.CpuTemp = Math.Round(best, 1);
                    snap.CpuTempSource = "ACPI thermal zone";
                    snap.CpuTempApproximate = true;
                }
            }
        }

        private static object SafeProp(ManagementBaseObject o, string name)
        {
            try { return o[name]; } catch { return null; }
        }

        private static List<ManagementBaseObject> Query(string wql)
        {
            try
            {
                using (var s = new ManagementObjectSearcher(wql)) return s.Get().Cast<ManagementBaseObject>().ToList();
            }
            catch { return new List<ManagementBaseObject>(); }
        }

        private static ManagementBaseObject QueryFirst(string wql) => Query(wql).FirstOrDefault();

        public void Dispose()
        {
            lock (_lock)
            {
                try { _computer?.Close(); } catch { }
                _computer = null;
            }
        }
    }
}
