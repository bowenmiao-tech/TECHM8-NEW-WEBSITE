using System;
using System.IO;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Windows.Forms;

namespace Techm8.Diagnostics
{
    internal static class Program
    {
        [STAThread]
        private static void Main(string[] args)
        {
            // Dependencies are embedded as "embedded.<name>.dll" resources (see the
            // csproj). This must be hooked up before any code touches those types.
            AppDomain.CurrentDomain.AssemblyResolve += ResolveEmbedded;
            Run(args);
        }

        [MethodImpl(MethodImplOptions.NoInlining)]
        private static void Run(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.ThreadException += (s, e) => ShowCrash(e.Exception);
            AppDomain.CurrentDomain.UnhandledException += (s, e) => ShowCrash(e.ExceptionObject as Exception);
            var form = new MainForm();
            // Development only: "--selftest <folder>" runs a short unattended check and saves screenshots.
            if (args.Length == 2 && args[0] == "--selftest") form.SelfTestFolder = args[1];
            Application.Run(form);
        }

        private static Assembly ResolveEmbedded(object sender, ResolveEventArgs args)
        {
            string name = new AssemblyName(args.Name).Name;
            foreach (Assembly loaded in AppDomain.CurrentDomain.GetAssemblies())
            {
                if (loaded.GetName().Name == name) return loaded;
            }
            using (Stream stream = typeof(Program).Assembly.GetManifestResourceStream("embedded." + name + ".dll"))
            {
                if (stream == null) return null;
                byte[] bytes = new byte[stream.Length];
                int read = 0;
                while (read < bytes.Length) read += stream.Read(bytes, read, bytes.Length - read);
                return Assembly.Load(bytes);
            }
        }

        private static void ShowCrash(Exception ex)
        {
            MessageBox.Show("Something went wrong:\n\n" + ex, "TECHM8 Diagnostics", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
