using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Text;

namespace Techm8.Diagnostics
{
    internal enum Level { None, Ok, Warn, Bad }

    internal sealed class StressResult
    {
        public DateTime Started;
        public int Seconds, Threads;
        public bool Cpu, Gpu;
        public double? Baseline, FinalScore, ThrottlePct;
        public double? CpuTempStart, CpuTempMax, GpuTempMax, ClockMin, ClockMax, FpsAvg, CpuPowerMax;
        public bool CpuTempApproximate;
        public string GpuRenderer;
    }

    internal static class Verdicts
    {
        public static string F(double? v, int digits = 0) => v == null ? "–" : v.Value.ToString("F" + digits, CultureInfo.InvariantCulture);

        public static Level Worse(Level a, Level b) => (Level)Math.Max((int)a, (int)b);

        public static Level CpuTemp(double? t) => t == null ? Level.None : t >= 95 ? Level.Bad : t >= 85 ? Level.Warn : Level.Ok;
        public static Level GpuTemp(double? t) => t == null ? Level.None : t >= 90 ? Level.Bad : t >= 84 ? Level.Warn : Level.Ok;
        public static Level Throttle(double? p) => p == null ? Level.None : p >= 25 ? Level.Bad : p >= 10 ? Level.Warn : Level.Ok;

        public static Tuple<Level, string> Battery(double? healthPct)
        {
            if (healthPct == null) return Tuple.Create(Level.None, "Wear not reported");
            if (healthPct >= 80) return Tuple.Create(Level.Ok, "Good");
            if (healthPct >= 60) return Tuple.Create(Level.Warn, "Worn - replacement worth considering");
            return Tuple.Create(Level.Bad, "Replace battery");
        }

        public static Tuple<Level, string, string> Stress(StressResult s)
        {
            var notes = new List<string>();
            Level level = Level.Ok;
            if (s.CpuTempMax != null)
            {
                notes.Add($"CPU peaked at {F(s.CpuTempMax)}°C{(s.CpuTempApproximate ? " (approximate sensor)" : "")}");
                if (!s.CpuTempApproximate) level = Worse(level, CpuTemp(s.CpuTempMax));
            }
            if (s.GpuTempMax != null)
            {
                notes.Add($"GPU peaked at {F(s.GpuTempMax)}°C");
                level = Worse(level, GpuTemp(s.GpuTempMax));
            }
            if (s.ThrottlePct != null)
            {
                notes.Add($"CPU performance dropped {F(s.ThrottlePct)}% from the start");
                level = Worse(level, Throttle(s.ThrottlePct));
            }
            if (s.FpsAvg != null) notes.Add($"GPU averaged {F(s.FpsAvg)} FPS");
            if (s.Seconds < 60) notes.Add("ran under a minute, which is too short to judge cooling");
            string label = level == Level.Ok ? "Passed" : level == Level.Warn ? "Check cooling" : "Overheating / throttling";
            return Tuple.Create(level, label, (notes.Count > 0 ? string.Join("; ", notes) : "No sensor data was recorded") + ".");
        }

        public static List<Tuple<Level, string>> Findings(Inventory inv, StressResult stress, ErrorScan errors)
        {
            var list = new List<Tuple<Level, string>>();
            foreach (var b in inv?.Batteries ?? new List<BatteryInfo>())
            {
                var v = Battery(b.HealthPct);
                if (v.Item1 != Level.None) list.Add(Tuple.Create(v.Item1, $"Battery health {F(b.HealthPct)}% ({F(b.FullMWh / 1000, 1)} of {F(b.DesignMWh / 1000, 1)} Wh) - {v.Item2}"));
            }
            foreach (var d in inv?.Disks ?? new List<DiskInfo>())
            {
                if (!string.IsNullOrEmpty(d.Health) && d.Health != "Healthy") list.Add(Tuple.Create(Level.Bad, $"Drive {d.Name} reports {d.Health}"));
                if (d.WearPct >= 70) list.Add(Tuple.Create(d.WearPct >= 90 ? Level.Bad : Level.Warn, $"Drive {d.Name} is {d.WearPct}% worn"));
            }
            foreach (var v in inv?.Volumes ?? new List<VolumeInfo>())
            {
                if (v.SizeGB > 0 && v.FreeGB / v.SizeGB < 0.1) list.Add(Tuple.Create(Level.Warn, $"{v.Letter} has only {v.FreeGB} GB free"));
            }
            if (stress != null)
            {
                var s = Stress(stress);
                list.Add(Tuple.Create(s.Item1, "Stress test: " + s.Item3));
            }
            if (errors != null)
            {
                var c = errors.Counts;
                if (c["bsod"] > 0) list.Add(Tuple.Create(Level.Bad, $"{c["bsod"]} blue screen crash(es) in the last {errors.Days} days"));
                if (c["hardware"] > 0) list.Add(Tuple.Create(Level.Bad, $"{c["hardware"]} WHEA hardware error(s) logged"));
                if (c["storage"] > 0) list.Add(Tuple.Create(Level.Warn, $"{c["storage"]} disk / storage error(s) logged"));
                if (c["power"] > 0) list.Add(Tuple.Create(Level.Warn, $"{c["power"]} unexpected shutdown(s)"));
                if (c["gpu"] > 0) list.Add(Tuple.Create(Level.Warn, $"{c["gpu"]} graphics driver reset(s)"));
            }
            if (list.Count == 0) list.Add(Tuple.Create(Level.Ok, "No problems detected by the checks that ran."));
            return list;
        }
    }

    internal static class Report
    {
        private static string E(object s) => WebUtility.HtmlEncode(s?.ToString() ?? "");
        private static string Row(string k, string vHtml) => $"<tr><th>{E(k)}</th><td>{vHtml}</td></tr>";
        private static string D(DateTime? d) => d?.ToString("d MMM yyyy", CultureInfo.InvariantCulture) ?? "–";
        private static string DT(DateTime? d) => d?.ToString("d MMM yyyy HH:mm", CultureInfo.InvariantCulture) ?? "–";
        private static string F(double? v, int digits = 0) => Verdicts.F(v, digits);

        public static string Build(Inventory inv, StressResult stress, ErrorScan errors, string job, string customer, string notes)
        {
            var sb = new StringBuilder();
            sb.Append("<!doctype html><html lang=\"en-AU\"><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />");
            sb.Append($"<title>TECHM8 PC Health Report{(job.Length > 0 ? " - " + E(job) : "")}</title><style>");
            sb.Append("body{font:14px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#07272d;max-width:960px;margin:0 auto;padding:24px;background:#fff}");
            sb.Append("h1{margin:0 0 4px;font-size:26px}h2{margin:28px 0 8px;font-size:18px;border-bottom:2px solid #16c8ba;padding-bottom:4px}h3{font-size:15px;margin:18px 0 6px}");
            sb.Append(".meta{color:#53757b;margin:0 0 12px}table{width:100%;border-collapse:collapse;margin:0 0 8px}th,td{padding:6px 8px;border-bottom:1px solid #dfe9e8;text-align:left;vertical-align:top}");
            sb.Append("th{width:28%;color:#53757b;font-weight:600}.events th{width:auto}.events td{font-size:12px}");
            sb.Append("ul.f{padding-left:0;list-style:none}ul.f li{padding:6px 10px;margin:4px 0;border-radius:6px;border-left:4px solid}");
            sb.Append("li.Ok{background:#e9f8ef;border-color:#13804a}li.Warn{background:#fdf3e2;border-color:#e69614}li.Bad{background:#fbe9e7;border-color:#c0392b}");
            sb.Append(".notes{white-space:pre-wrap;background:#f4faf9;padding:10px;border-radius:6px}@media print{body{padding:0}}</style></head><body>");

            sb.Append("<h1>TECHM8 PC Health Report</h1>");
            sb.Append($"<p class=\"meta\">{E(DateTime.Now.ToString("d MMM yyyy HH:mm", CultureInfo.InvariantCulture))}");
            if (job.Length > 0) sb.Append($" · Job {E(job)}");
            if (customer.Length > 0) sb.Append($" · {E(customer)}");
            sb.Append(" · techm8australia.com</p>");
            if (notes.Length > 0) sb.Append($"<p class=\"notes\">{E(notes)}</p>");

            sb.Append("<h2>Summary</h2><ul class=\"f\">");
            foreach (var f in Verdicts.Findings(inv, stress, errors)) sb.Append($"<li class=\"{(f.Item1 == Level.None ? Level.Ok : f.Item1)}\">{E(f.Item2)}</li>");
            sb.Append("</ul>");

            sb.Append("<h2>System</h2><table>");
            if (inv != null)
            {
                sb.Append(Row("Device", E(string.Join(" ", new[] { inv.Manufacturer, inv.Model }.Where(s => s.Length > 0)))));
                sb.Append(Row("Serial number", E(inv.Serial.Length > 0 ? inv.Serial : "–")));
                sb.Append(Row("Computer name", E(inv.ComputerName)));
                sb.Append(Row("Windows", E($"{inv.OsName} {inv.OsArch} build {inv.OsBuild}")));
                foreach (var c in inv.Cpus) sb.Append(Row("Processor", E($"{c.Name} ({c.Cores}C/{c.Threads}T)")));
                foreach (var g in inv.Gpus) sb.Append(Row("Graphics", E($"{g.Name}{(g.VramGB > 0 ? $" {g.VramGB} GB" : "")} · driver {g.Driver}")));
                sb.Append(Row("Memory", E($"{inv.TotalRamGB:F0} GB") + "<br />" + string.Join("<br />", inv.Memory.Select(m => E($"{m.Slot}: {m.SizeGB} GB {m.Type} {(m.ConfiguredMTs > 0 ? m.ConfiguredMTs : m.SpeedMTs)} MT/s {m.Maker} {m.Part}")))));
                foreach (var d in inv.Disks)
                {
                    sb.Append(Row("Drive", E($"{d.Name} · {d.SizeGB} GB {d.Bus} {d.Media} · {d.Health}"
                        + (d.WearPct != null ? $" · {d.WearPct}% worn" : "")
                        + (d.PowerOnHours != null ? $" · {d.PowerOnHours} h" : "")
                        + (d.TempC != null ? $" · {d.TempC}°C" : ""))));
                }
                sb.Append(Row("Motherboard", E($"{inv.BoardMaker} {inv.BoardProduct} · BIOS {inv.BiosVersion} ({D(inv.BiosDate)})")));
            }
            sb.Append("</table>");

            foreach (var b in inv?.Batteries ?? new List<BatteryInfo>())
            {
                sb.Append("<h2>Battery</h2><table>");
                sb.Append(Row("Battery", E(string.Join(" ", new[] { b.Maker, b.Name, b.Chemistry }.Where(s => !string.IsNullOrEmpty(s))))));
                sb.Append(Row("Health", E($"{F(b.HealthPct)}% - {Verdicts.Battery(b.HealthPct).Item2}")));
                sb.Append(Row("Capacity", E($"{F(b.FullMWh / 1000, 1)} Wh of {F(b.DesignMWh / 1000, 1)} Wh design")));
                sb.Append(Row("Cycle count", E(b.Cycles?.ToString() ?? "not reported")));
                sb.Append("</table>");
            }

            sb.Append("<h2>Stress test</h2>");
            if (stress == null)
            {
                sb.Append("<p>No stress test was run.</p>");
            }
            else
            {
                var s = stress;
                sb.Append("<table>");
                sb.Append(Row("Started", E(DT(s.Started))));
                sb.Append(Row("Duration", E($"{s.Seconds / 60} min {s.Seconds % 60} s")));
                sb.Append(Row("Load", E(string.Join(" + ", new[] { s.Cpu ? $"CPU ({s.Threads} threads)" : null, s.Gpu ? $"GPU ({s.GpuRenderer})" : null }.Where(x => x != null)))));
                sb.Append(Row("CPU temperature", E(s.CpuTempMax != null ? $"{F(s.CpuTempStart)}°C at start, {F(s.CpuTempMax)}°C peak{(s.CpuTempApproximate ? " (approximate ACPI sensor)" : "")}" : "not available")));
                sb.Append(Row("CPU package power", E(s.CpuPowerMax != null ? $"{F(s.CpuPowerMax)} W peak" : "not available")));
                sb.Append(Row("GPU temperature", E(s.GpuTempMax != null ? $"{F(s.GpuTempMax)}°C peak" : "not available")));
                sb.Append(Row("CPU clock", E(s.ClockMax != null ? $"{F(s.ClockMin)} - {F(s.ClockMax)} MHz" : "not available")));
                sb.Append(Row("CPU score", E(s.Baseline != null ? $"{F(s.Baseline)} baseline, {F(s.FinalScore)} at end ({F(s.ThrottlePct)}% drop)" : s.FinalScore != null ? F(s.FinalScore) : "–")));
                sb.Append(Row("GPU FPS", E(s.FpsAvg != null ? $"{F(s.FpsAvg)} average" : "–")));
                sb.Append(Row("Result", E(Verdicts.Stress(s).Item3)));
                sb.Append("</table>");
            }

            sb.Append("<h2>Errors and crashes</h2>");
            if (errors == null)
            {
                sb.Append("<p>Event logs were not read.</p>");
            }
            else
            {
                sb.Append("<table>");
                foreach (var kv in ErrorScan.Categories) sb.Append(Row(kv.Value[0], E(errors.Counts[kv.Key])));
                if (errors.Stability != null) sb.Append(Row("Reliability index", E($"{errors.Stability} / 10")));
                sb.Append(Row("Crash dumps", errors.Minidumps.Count == 0 ? "none" : string.Join("<br />", errors.Minidumps.Select(f => E($"{f.Name} ({DT(f.LastWriteTime)})")))));
                sb.Append("</table>");
                var list = errors.Events.Take(120).ToList();
                if (list.Count > 0)
                {
                    sb.Append("<h3>Events (hardware-related first)</h3><table class=\"events\"><tr><th>Time</th><th>Type</th><th>Source</th><th>Message</th></tr>");
                    foreach (var ev in list)
                    {
                        string msg = ev.Message.Length > 400 ? ev.Message.Substring(0, 400) + "..." : ev.Message;
                        sb.Append($"<tr><td>{E(DT(ev.Time))}</td><td>{E(ErrorScan.Categories[ev.Category][0])}</td><td>{E(ev.Provider)} #{ev.Id}</td><td>{E(msg)}</td></tr>");
                    }
                    sb.Append("</table>");
                }
            }

            sb.Append("</body></html>");
            return sb.ToString();
        }
    }
}
