using System;
using System.Drawing;
using System.Numerics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace Techm8.Diagnostics
{
    /// <summary>
    /// Loads every logical processor with SIMD multiply-add work. Throughput is
    /// reported as a score so a drop over time shows thermal throttling.
    /// </summary>
    internal sealed class CpuStress
    {
        private const int Batch = 4096;
        private Thread[] _threads;
        private volatile bool _running;
        private long _ops;

        public int Threads => _threads?.Length ?? 0;

        public void Start()
        {
            _running = true;
            _threads = new Thread[Environment.ProcessorCount];
            for (int i = 0; i < _threads.Length; i++)
            {
                // Below normal keeps the window responsive while every core still runs at 100%.
                _threads[i] = new Thread(Work) { IsBackground = true, Priority = ThreadPriority.BelowNormal, Name = "cpu-stress-" + i };
                _threads[i].Start(i);
            }
        }

        public void Stop()
        {
            _running = false;
            if (_threads == null) return;
            foreach (Thread t in _threads) t.Join(2000);
            _threads = null;
        }

        /// <summary>Millions of vector operations since the last call.</summary>
        public double TakeMegaOps() => Interlocked.Exchange(ref _ops, 0) / 1e6;

        private void Work(object seed)
        {
            // a < 1 keeps every lane converging towards b / (1 - a) instead of overflowing.
            var a = new Vector<float>(0.99991f);
            var b = new Vector<float>(0.00009f);
            float s = (int)seed * 0.01f;
            Vector<float> v0 = new Vector<float>(s + 0.1f), v1 = new Vector<float>(s + 0.2f), v2 = new Vector<float>(s + 0.3f), v3 = new Vector<float>(s + 0.4f);
            Vector<float> v4 = new Vector<float>(s + 0.5f), v5 = new Vector<float>(s + 0.6f), v6 = new Vector<float>(s + 0.7f), v7 = new Vector<float>(s + 0.8f);
            while (_running)
            {
                for (int i = 0; i < Batch; i++)
                {
                    v0 = v0 * a + b; v1 = v1 * a + b; v2 = v2 * a + b; v3 = v3 * a + b;
                    v4 = v4 * a + b; v5 = v5 * a + b; v6 = v6 * a + b; v7 = v7 * a + b;
                }
                Interlocked.Add(ref _ops, Batch * 8L * Vector<float>.Count);
            }
            // Keeps the JIT from discarding the loop.
            if ((v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7)[0] < -1) Console.WriteLine();
        }
    }

    /// <summary>
    /// A window that renders a heavy fragment shader with OpenGL as fast as the GPU
    /// allows (vsync off). Closing it stops the GPU load.
    /// </summary>
    internal sealed class GpuStressForm : Form
    {
        private Thread _renderThread;
        private volatile bool _running;
        private int _frames;
        public string Renderer { get; private set; } = "";
        /// <summary>Shader passes per frame: the load level the GPU settled on.</summary>
        public int Passes { get; private set; } = 1;
        public string Error { get; private set; }

        private const string FragmentShader = @"
            #version 120
            uniform float t;
            uniform vec2 r;
            void main() {
                vec2 uv = (gl_FragCoord.xy * 2.0 - r) / r.y;
                float a = 0.0;
                for (int i = 0; i < 160; i++) {
                    float fi = float(i);
                    vec2 q = uv * (1.0 + fi * 0.015) + vec2(sin(t * 0.7 + fi * 0.13), cos(t * 0.6 + fi * 0.11)) * 0.4;
                    float d = length(q);
                    a += 0.012 / abs(sin(d * 8.0 - t + fi * 0.05) + 0.02) * exp(-d * 1.4);
                }
                gl_FragColor = vec4(vec3(0.09, 0.78, 0.73) * a * 0.25, 1.0);
            }";

        public GpuStressForm()
        {
            Text = "TECHM8 GPU stress - close this window to stop the GPU test";
            // Small and in the bottom-right corner so the main window's readings stay visible.
            ClientSize = new Size(560, 315);
            StartPosition = FormStartPosition.Manual;
            Rectangle area = Screen.PrimaryScreen.WorkingArea;
            Location = new Point(area.Right - Width - 12, area.Bottom - Height - 12);
            BackColor = Color.Black;
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.Opaque, true);
        }

        protected override CreateParams CreateParams
        {
            get
            {
                const int CS_OWNDC = 0x20;
                var cp = base.CreateParams;
                cp.ClassStyle |= CS_OWNDC;
                return cp;
            }
        }

        public int TakeFrames() => Interlocked.Exchange(ref _frames, 0);

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            _running = true;
            IntPtr hwnd = Handle;
            _renderThread = new Thread(() => RenderLoop(hwnd)) { IsBackground = true, Name = "gpu-stress" };
            _renderThread.Start();
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            _running = false;
            _renderThread?.Join(3000);
            base.OnFormClosing(e);
        }

        private void RenderLoop(IntPtr hwnd)
        {
            IntPtr hdc = GetDC(hwnd);
            IntPtr ctx = IntPtr.Zero;
            try
            {
                var pfd = new PIXELFORMATDESCRIPTOR
                {
                    nSize = (ushort)Marshal.SizeOf(typeof(PIXELFORMATDESCRIPTOR)),
                    nVersion = 1,
                    dwFlags = PFD_DRAW_TO_WINDOW | PFD_SUPPORT_OPENGL | PFD_DOUBLEBUFFER,
                    iPixelType = 0,
                    cColorBits = 32,
                };
                int format = ChoosePixelFormat(hdc, ref pfd);
                if (format == 0 || !SetPixelFormat(hdc, format, ref pfd)) throw new Exception("No OpenGL pixel format.");
                ctx = wglCreateContext(hdc);
                if (ctx == IntPtr.Zero || !wglMakeCurrent(hdc, ctx)) throw new Exception("Could not create an OpenGL context.");
                Renderer = Marshal.PtrToStringAnsi(glGetString(GL_RENDERER)) ?? "";

                var swapInterval = LoadGl<SwapIntervalFn>("wglSwapIntervalEXT");
                swapInterval?.Invoke(0);

                var createShader = LoadGl<CreateShaderFn>("glCreateShader");
                var shaderSource = LoadGl<ShaderSourceFn>("glShaderSource");
                var compileShader = LoadGl<UintFn>("glCompileShader");
                var getShaderiv = LoadGl<GetivFn>("glGetShaderiv");
                var createProgram = LoadGl<CreateProgramFn>("glCreateProgram");
                var attachShader = LoadGl<AttachShaderFn>("glAttachShader");
                var linkProgram = LoadGl<UintFn>("glLinkProgram");
                var getProgramiv = LoadGl<GetivFn>("glGetProgramiv");
                var useProgram = LoadGl<UintFn>("glUseProgram");
                var getUniform = LoadGl<GetUniformLocationFn>("glGetUniformLocation");
                var uniform1f = LoadGl<Uniform1fFn>("glUniform1f");
                var uniform2f = LoadGl<Uniform2fFn>("glUniform2f");
                if (createShader == null || uniform2f == null) throw new Exception("This graphics driver does not support OpenGL 2.0 shaders.");

                uint fs = createShader(GL_FRAGMENT_SHADER);
                shaderSource(fs, 1, new[] { FragmentShader }, IntPtr.Zero);
                compileShader(fs);
                getShaderiv(fs, GL_COMPILE_STATUS, out int ok);
                if (ok == 0) throw new Exception("Shader failed to compile.");
                uint prog = createProgram();
                attachShader(prog, fs);
                linkProgram(prog);
                getProgramiv(prog, GL_LINK_STATUS, out ok);
                if (ok == 0) throw new Exception("Shader failed to link.");
                useProgram(prog);
                int uT = getUniform(prog, "t");
                int uR = getUniform(prog, "r");

                // A small window renders so fast that per-frame overhead, not the GPU,
                // becomes the limit. Draw the shader several times per frame and keep
                // adjusting so frames land around 60-120 FPS with the GPU fully busy.
                var clock = System.Diagnostics.Stopwatch.StartNew();
                int passes = 1, framesThisSecond = 0;
                double secondStart = 0;
                while (_running)
                {
                    GetClientRect(hwnd, out RECT rc);
                    int w = Math.Max(1, rc.Right - rc.Left), h = Math.Max(1, rc.Bottom - rc.Top);
                    glViewport(0, 0, w, h);
                    uniform1f(uT, (float)clock.Elapsed.TotalSeconds);
                    uniform2f(uR, w, h);
                    for (int i = 0; i < passes; i++)
                    {
                        glBegin(GL_TRIANGLES);
                        glVertex2f(-1, -1);
                        glVertex2f(3, -1);
                        glVertex2f(-1, 3);
                        glEnd();
                    }
                    SwapBuffers(hdc);
                    Interlocked.Increment(ref _frames);

                    framesThisSecond++;
                    double now = clock.Elapsed.TotalSeconds;
                    if (now - secondStart >= 1)
                    {
                        double fps = framesThisSecond / (now - secondStart);
                        if (fps > 120) passes = Math.Min(1024, (int)Math.Ceiling(passes * Math.Min(4, fps / 90)));
                        else if (fps < 40) passes = Math.Max(1, passes / 2);
                        Passes = passes;
                        framesThisSecond = 0;
                        secondStart = now;
                    }
                }
            }
            catch (Exception ex)
            {
                Error = ex.Message;
            }
            finally
            {
                wglMakeCurrent(IntPtr.Zero, IntPtr.Zero);
                if (ctx != IntPtr.Zero) wglDeleteContext(ctx);
                ReleaseDC(hwnd, hdc);
            }
        }

        private static T LoadGl<T>(string name) where T : class
        {
            // Some drivers return 1, 2, 3 or -1 instead of null for missing functions.
            long p = (long)wglGetProcAddress(name);
            if (p == 0 || p == 1 || p == 2 || p == 3 || p == -1) return null;
            return Marshal.GetDelegateForFunctionPointer(new IntPtr(p), typeof(T)) as T;
        }

        // ------------------------------------------------------------ interop

        private const uint PFD_DRAW_TO_WINDOW = 0x4, PFD_SUPPORT_OPENGL = 0x20, PFD_DOUBLEBUFFER = 0x1;
        private const uint GL_TRIANGLES = 4, GL_FRAGMENT_SHADER = 0x8B30, GL_COMPILE_STATUS = 0x8B81, GL_LINK_STATUS = 0x8B82, GL_RENDERER = 0x1F01;

        [StructLayout(LayoutKind.Sequential)]
        private struct PIXELFORMATDESCRIPTOR
        {
            public ushort nSize, nVersion;
            public uint dwFlags;
            public byte iPixelType, cColorBits, cRedBits, cRedShift, cGreenBits, cGreenShift, cBlueBits, cBlueShift, cAlphaBits, cAlphaShift;
            public byte cAccumBits, cAccumRedBits, cAccumGreenBits, cAccumBlueBits, cAccumAlphaBits, cDepthBits, cStencilBits, cAuxBuffers, iLayerType, bReserved;
            public uint dwLayerMask, dwVisibleMask, dwDamageMask;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct RECT { public int Left, Top, Right, Bottom; }

        [DllImport("user32.dll")] private static extern IntPtr GetDC(IntPtr hwnd);
        [DllImport("user32.dll")] private static extern int ReleaseDC(IntPtr hwnd, IntPtr hdc);
        [DllImport("user32.dll")] private static extern bool GetClientRect(IntPtr hwnd, out RECT rect);
        [DllImport("gdi32.dll")] private static extern int ChoosePixelFormat(IntPtr hdc, ref PIXELFORMATDESCRIPTOR pfd);
        [DllImport("gdi32.dll")] private static extern bool SetPixelFormat(IntPtr hdc, int format, ref PIXELFORMATDESCRIPTOR pfd);
        [DllImport("gdi32.dll")] private static extern bool SwapBuffers(IntPtr hdc);
        [DllImport("opengl32.dll")] private static extern IntPtr wglCreateContext(IntPtr hdc);
        [DllImport("opengl32.dll")] private static extern bool wglMakeCurrent(IntPtr hdc, IntPtr ctx);
        [DllImport("opengl32.dll")] private static extern bool wglDeleteContext(IntPtr ctx);
        [DllImport("opengl32.dll")] private static extern IntPtr wglGetProcAddress(string name);
        [DllImport("opengl32.dll")] private static extern IntPtr glGetString(uint name);
        [DllImport("opengl32.dll")] private static extern void glViewport(int x, int y, int w, int h);
        [DllImport("opengl32.dll")] private static extern void glBegin(uint mode);
        [DllImport("opengl32.dll")] private static extern void glEnd();
        [DllImport("opengl32.dll")] private static extern void glVertex2f(float x, float y);

        [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate bool SwapIntervalFn(int interval);
        [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate uint CreateShaderFn(uint type);
        [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate void ShaderSourceFn(uint shader, int count, [MarshalAs(UnmanagedType.LPArray, ArraySubType = UnmanagedType.LPStr)] string[] src, IntPtr lengths);
        [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate void UintFn(uint id);
        [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate void GetivFn(uint id, uint pname, out int value);
        [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate uint CreateProgramFn();
        [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate void AttachShaderFn(uint program, uint shader);
        [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate int GetUniformLocationFn(uint program, [MarshalAs(UnmanagedType.LPStr)] string name);
        [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate void Uniform1fFn(int location, float v);
        [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate void Uniform2fFn(int location, float x, float y);
    }
}
