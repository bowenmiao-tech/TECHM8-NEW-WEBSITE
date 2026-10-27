using System;
using System.Diagnostics;
using System.IO;
using System.Net;

namespace Techm8.Diagnostics
{
    /// <summary>
    /// PawnIO is the signed, open-source driver LibreHardwareMonitor uses to read
    /// CPU temperatures (https://pawnio.eu). It is installed only when the
    /// technician asks, and can be removed again when the app closes.
    /// </summary>
    internal static class PawnIoSetup
    {
        public const string DownloadUrl = "https://github.com/namazso/PawnIO.Setup/releases/latest/download/PawnIO_setup.exe";

        private static string SetupPath => Path.Combine(Path.GetTempPath(), "TECHM8-PawnIO_setup.exe");

        public static bool InstalledThisSession { get; private set; }

        /// <summary>Downloads and runs the official installer. Returns an error message or null.</summary>
        public static string Install()
        {
            try
            {
                ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
                using (var web = new WebClient())
                {
                    web.Headers[HttpRequestHeader.UserAgent] = "TECHM8-Diagnostics";
                    web.DownloadFile(DownloadUrl, SetupPath);
                }
            }
            catch (Exception ex)
            {
                return "Could not download the driver installer. Check the internet connection.\n\n" + ex.Message;
            }

            RunSetup("-install -silent");
            // Fall back to the installer's own window if the silent switches are not recognised.
            if (!Sensors.PawnIoInstalled()) RunSetup("");
            if (!Sensors.PawnIoInstalled()) return "The driver installer finished but PawnIO is not installed.";
            InstalledThisSession = true;
            return null;
        }

        public static void Uninstall()
        {
            if (File.Exists(SetupPath)) RunSetup("-uninstall -silent");
            try { File.Delete(SetupPath); } catch { }
        }

        private static void RunSetup(string args)
        {
            try
            {
                using (var p = Process.Start(new ProcessStartInfo(SetupPath, args) { UseShellExecute = true }))
                {
                    p?.WaitForExit(180000);
                }
            }
            catch { }
        }
    }
}
