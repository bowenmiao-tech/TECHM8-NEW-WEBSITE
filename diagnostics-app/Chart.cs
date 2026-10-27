using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Linq;
using System.Windows.Forms;

namespace Techm8.Diagnostics
{
    internal sealed class ChartSeries
    {
        public string Label;
        public Color Color;
        public Func<Sample, double?> Value;
    }

    internal sealed class Sample
    {
        public double? CpuTemp, GpuTemp, CpuLoad, CpuClock, Score, Baseline;
    }

    /// <summary>A simple line chart over the shared sample history.</summary>
    internal sealed class Chart : Control
    {
        public List<ChartSeries> Series = new List<ChartSeries>();
        public List<Sample> Samples;
        public double Min, Max;
        public string Unit = "", Empty = "";

        public Chart()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint | ControlStyles.ResizeRedraw, true);
            BackColor = Theme.Surface;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(BackColor);
            float scale = DeviceDpi / 96f;
            float left = 44 * scale, right = 10 * scale, top = 26 * scale, bottom = 22 * scale;
            float pw = Width - left - right, ph = Height - top - bottom;
            if (pw <= 10 || ph <= 10) return;

            var values = Series.SelectMany(s => Samples.Select(s.Value)).Where(v => v != null).Select(v => v.Value).ToList();
            double max = Max;
            if (values.Count > 0) max = Math.Max(Max, Math.Ceiling((values.Max() + 1) / 20) * 20);
            double min = Min;

            using (var font = new Font(Font.FontFamily, 8f))
            using (var muted = new SolidBrush(Theme.Muted))
            using (var grid = new Pen(Color.FromArgb(24, 7, 39, 45)))
            {
                // Legend
                float lx = left;
                foreach (var s in Series)
                {
                    using (var b = new SolidBrush(s.Color)) g.FillRectangle(b, lx, 9 * scale, 12 * scale, 3 * scale);
                    g.DrawString(s.Label, font, muted, lx + 15 * scale, 3 * scale);
                    lx += 15 * scale + g.MeasureString(s.Label, font).Width + 14 * scale;
                }

                for (int i = 0; i <= 4; i++)
                {
                    double v = min + (max - min) * i / 4;
                    float y = top + ph - ph * i / 4;
                    g.DrawLine(grid, left, y, Width - right, y);
                    string label = Math.Round(v) + Unit;
                    var size = g.MeasureString(label, font);
                    g.DrawString(label, font, muted, left - size.Width - 4, y - size.Height / 2);
                }

                int n = Math.Max(60, Samples.Count);
                g.DrawString(n >= 120 ? $"last {Math.Round(n / 60.0)} min" : $"last {n} s", font, muted, left, top + ph + 4);

                if (values.Count == 0)
                {
                    var sz = g.MeasureString(Empty, Font);
                    g.DrawString(Empty, Font, muted, left + (pw - sz.Width) / 2, top + (ph - sz.Height) / 2);
                    return;
                }

                foreach (var s in Series)
                {
                    using (var pen = new Pen(s.Color, 2 * scale) { LineJoin = LineJoin.Round })
                    {
                        var run = new List<PointF>();
                        for (int i = 0; i < Samples.Count; i++)
                        {
                            double? v = s.Value(Samples[i]);
                            if (v == null)
                            {
                                Flush(g, pen, run);
                                continue;
                            }
                            float x = left + pw * i / Math.Max(1, n - 1);
                            float y = (float)(top + ph - ph * (Math.Min(max, Math.Max(min, v.Value)) - min) / (max - min));
                            run.Add(new PointF(x, y));
                        }
                        Flush(g, pen, run);
                    }
                }
            }
        }

        private static void Flush(Graphics g, Pen pen, List<PointF> run)
        {
            if (run.Count > 1) g.DrawLines(pen, run.ToArray());
            run.Clear();
        }
    }

    internal static class Theme
    {
        public static readonly Color Brand = Color.FromArgb(15, 151, 155);
        public static readonly Color Text = Color.FromArgb(7, 39, 45);
        public static readonly Color Muted = Color.FromArgb(83, 117, 123);
        public static readonly Color Surface = Color.FromArgb(248, 255, 254);
        public static readonly Color Background = Color.FromArgb(238, 248, 247);
        public static readonly Color Ok = Color.FromArgb(19, 128, 74);
        public static readonly Color Warn = Color.FromArgb(165, 101, 10);
        public static readonly Color Bad = Color.FromArgb(176, 50, 42);
        public static readonly Color CpuTemp = Color.FromArgb(228, 87, 46);
        public static readonly Color GpuTemp = Color.FromArgb(123, 97, 255);
        public static readonly Color Load = Color.FromArgb(22, 200, 186);
        public static readonly Color Clock = Color.FromArgb(15, 111, 209);
        public static readonly Color Score = Color.FromArgb(230, 150, 20);
    }
}
