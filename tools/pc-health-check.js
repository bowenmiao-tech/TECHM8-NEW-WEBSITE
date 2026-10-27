// PC Health Check (pc-health-check.html).
// Browser-only parts: stress test (Web Workers + WebGL) and basic specs.
// Everything the browser cannot see (temperatures, battery wear, event logs)
// comes from tools/techm8-agent.ps1, which serves JSON on localhost:8765.
(function () {
  "use strict";

  const AGENT = "http://localhost:8765";
  const HISTORY_LIMIT = 1800;
  const COLORS = { cpuTemp: "#e4572e", gpuTemp: "#7b61ff", load: "#16c8ba", clock: "#0f6fd1", score: "#e69614" };

  const $ = (id) => document.getElementById(id);
  const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const num = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
  const fmt = (v, d = 0) => (num(v) == null ? "\u2013" : Number(v).toFixed(d));
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("en-AU") : "\u2013");
  const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString("en-AU") : "\u2013");
  const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);
  const clean = (s) => (s && !/^(default string|to be filled by o\.e\.m\.|system product name|system manufacturer|not applicable)$/i.test(s.trim()) ? s.trim() : "");

  const state = {
    agent: false,
    connecting: false,
    sensorFails: 0,
    ping: null,
    info: null,
    sensors: null,
    errors: null,
    browser: {},
    history: [],
    maxCpuTemp: null,
    maxGpuTemp: null,
    maxClock: 0,
    stress: null,
    lastStress: null,
    errorFilter: null,
  };

  // ---------------------------------------------------------------- browser info

  async function collectBrowserInfo() {
    const b = { threads: navigator.hardwareConcurrency || null, memoryGB: navigator.deviceMemory || null };
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) b.gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL).replace(/^ANGLE \((.*)\)$/, "$1");
    } catch (e) {}
    b.screen = `${screen.width} \u00d7 ${screen.height} @ ${window.devicePixelRatio || 1}x`;
    b.os = navigator.platform || "";
    try {
      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        const h = await navigator.userAgentData.getHighEntropyValues(["platformVersion", "architecture", "model"]);
        if (navigator.userAgentData.platform === "Windows") {
          b.os = parseInt(h.platformVersion, 10) >= 13 ? "Windows 11" : "Windows 10 or older";
        } else {
          b.os = navigator.userAgentData.platform;
        }
        b.arch = h.architecture;
        b.browser = navigator.userAgentData.brands
          .filter((x) => !/Not.?A.?Brand|Chromium/i.test(x.brand))
          .map((x) => `${x.brand} ${x.version}`)
          .join(", ");
      }
    } catch (e) {}
    try {
      if (navigator.getBattery) {
        const bat = await navigator.getBattery();
        b.battery = { level: Math.round(bat.level * 100), charging: bat.charging };
      }
    } catch (e) {}
    state.browser = b;
  }

  // ---------------------------------------------------------------- agent

  async function agentFetch(path, timeout = 15000) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(AGENT + path, { signal: ctl.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function setPill(el, text, kind) {
    el.textContent = text;
    el.className = "tool-pill" + (kind ? ` tool-pill--${kind}` : "");
  }

  async function connect() {
    if (state.agent || state.connecting) return;
    state.connecting = true;
    setPill($("agent-status"), "Looking for agent\u2026", "warn");
    let tries = 0;
    while (!state.agent) {
      try {
        state.ping = await agentFetch("/ping", 2500);
        await onAgentConnected();
        break;
      } catch (e) {
        tries += 1;
        if (tries > 100) {
          setPill($("agent-status"), "Not connected", "bad");
          break;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    state.connecting = false;
  }

  async function onAgentConnected() {
    state.agent = true;
    state.sensorFails = 0;
    setPill(
      $("agent-status"),
      state.ping.isAdmin ? `Connected \u00b7 ${state.ping.computerName}` : "Connected \u00b7 not admin, some data missing",
      state.ping.isAdmin ? "ok" : "warn"
    );
    for (const id of ["errors-refresh", "open-reliability", "battery-report"]) $(id).disabled = false;
    pollSensors();
    try {
      setPill($("overview-source"), "Reading hardware\u2026", "warn");
      state.info = await agentFetch("/info", 60000);
      setPill($("overview-source"), "From agent", "ok");
    } catch (e) {
      setPill($("overview-source"), "Agent read failed", "bad");
    }
    renderOverview();
    renderBattery();
    renderStorage();
    loadErrors();
  }

  function onAgentLost() {
    state.agent = false;
    setPill($("agent-status"), "Disconnected \u00b7 retrying", "bad");
    for (const id of ["errors-refresh", "open-reliability", "battery-report"]) $(id).disabled = true;
    connect();
  }

  async function pollSensors() {
    if (!state.agent) return;
    try {
      const s = await agentFetch("/sensors", 10000);
      state.sensorFails = 0;
      onSensors(s);
    } catch (e) {
      state.sensorFails += 1;
      if (state.sensorFails >= 3) return onAgentLost();
    }
    setTimeout(pollSensors, 1000);
  }

  function onSensors(s) {
    state.sensors = s;
    const cpuT = num(s.cpuTemp && s.cpuTemp.value);
    const gpuT = num(arr(s.gpus).map((g) => num(g.temp)).filter((v) => v != null).sort((a, b) => b - a)[0]);
    if (cpuT != null) state.maxCpuTemp = Math.max(state.maxCpuTemp ?? cpuT, cpuT);
    if (gpuT != null) state.maxGpuTemp = Math.max(state.maxGpuTemp ?? gpuT, gpuT);
    const clock = num(s.cpu && s.cpu.clockMHz);
    if (clock) state.maxClock = Math.max(state.maxClock, clock);
    if (state.stress) {
      const st = state.stress;
      if (cpuT != null) st.cpuTempMax = Math.max(st.cpuTempMax ?? cpuT, cpuT);
      if (gpuT != null) st.gpuTempMax = Math.max(st.gpuTempMax ?? gpuT, gpuT);
      if (clock) st.clocks.push(clock);
    }
    renderSensorTable();
    renderBatteryLive();
  }

  // ---------------------------------------------------------------- stress test

  const WORKER_SRC = `
    let running = false;
    onmessage = (e) => { running = e.data === "start"; if (running) loop(); };
    function loop() {
      if (!running) return;
      const t0 = performance.now();
      let ops = 0, x = 0.5;
      while (performance.now() - t0 < 200) {
        for (let i = 1; i < 20000; i++) x = (x + Math.sqrt(i * x + 1.0001)) % 1000;
        ops += 20000;
      }
      postMessage(ops + (x < 0 ? 1 : 0));
      setTimeout(loop, 0);
    }`;

  // The load adapts: passes are added until the frame rate falls to about
  // 30 FPS, which means the GPU is saturated whether it is an iGPU or an RTX card.
  const gpuLoad = (() => {
    const canvas = $("gpu-canvas");
    const MAX_PASSES = 200;
    let gl, uTime, uRes, raf, frames = 0, passes = 1, running = false;

    const VS = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
    const FS = `precision highp float;
      uniform float t; uniform vec2 r;
      void main(){
        vec2 uv = (gl_FragCoord.xy * 2.0 - r) / r.y;
        float a = 0.0;
        for (int i = 0; i < 160; i++) {
          float fi = float(i);
          vec2 q = uv * (1.0 + fi * 0.015) + vec2(sin(t * 0.7 + fi * 0.13), cos(t * 0.6 + fi * 0.11)) * 0.4;
          float d = length(q);
          a += 0.012 / abs(sin(d * 8.0 - t + fi * 0.05) + 0.02) * exp(-d * 1.4);
        }
        gl_FragColor = vec4(vec3(0.09, 0.78, 0.73) * a * 0.25, 1.0);
      }`;

    function init() {
      gl = canvas.getContext("webgl", { antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
      if (!gl) return false;
      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      uTime = gl.getUniformLocation(prog, "t");
      uRes = gl.getUniformLocation(prog, "r");
      return true;
    }

    function frame(now) {
      if (!running) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uTime, now / 1000);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      for (let i = 0; i < passes; i += 1) gl.drawArrays(gl.TRIANGLES, 0, 3);
      frames += 1;
      raf = requestAnimationFrame(frame);
    }

    return {
      start() {
        if (!gl && !init()) return false;
        running = true;
        frames = 0;
        passes = 1;
        raf = requestAnimationFrame(frame);
        return true;
      },
      adjust(fps) {
        if (fps > 40) passes = Math.min(MAX_PASSES, Math.ceil(passes * 1.3));
        else if (fps < 24) passes = Math.max(1, Math.floor(passes * 0.85));
        return passes;
      },
      stop() {
        running = false;
        cancelAnimationFrame(raf);
      },
      takeFrames() {
        const f = frames;
        frames = 0;
        return f;
      },
    };
  })();

  function startStress() {
    const useCpu = $("stress-cpu").checked;
    const useGpu = $("stress-gpu").checked;
    if (!useCpu && !useGpu) return;
    const st = {
      startedAt: new Date(),
      t0: performance.now(),
      lastTick: performance.now(),
      duration: Number($("stress-duration").value),
      useCpu,
      useGpu,
      workers: [],
      ops: 0,
      scores: [],
      fps: [],
      clocks: [],
      baseline: null,
      cpuTempStart: num(state.sensors && state.sensors.cpuTemp && state.sensors.cpuTemp.value),
      cpuTempMax: null,
      gpuTempMax: null,
    };
    if (useCpu) {
      const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
      const n = navigator.hardwareConcurrency || 4;
      for (let i = 0; i < n; i += 1) {
        const w = new Worker(url);
        w.onmessage = (e) => (st.ops += e.data);
        w.postMessage("start");
        st.workers.push(w);
      }
      st.threads = n;
    }
    if (useGpu && !gpuLoad.start()) st.useGpu = false;
    state.stress = st;
    state.history = [];
    $("stress-start").disabled = true;
    $("stress-stop").disabled = false;
    $("stress-result").hidden = true;
    setPill($("stress-status"), "Running", "warn");
  }

  function stopStress(reason) {
    const st = state.stress;
    if (!st) return;
    for (const w of st.workers) w.terminate();
    gpuLoad.stop();
    state.stress = null;
    $("stress-start").disabled = false;
    $("stress-stop").disabled = true;

    const elapsed = Math.round((performance.now() - st.t0) / 1000);
    const finalScore = avg(st.scores.slice(-10));
    const throttlePct = st.baseline && finalScore != null ? Math.max(0, (1 - finalScore / st.baseline) * 100) : null;
    const clockMin = st.clocks.length ? Math.min(...st.clocks.slice(5)) : null;
    const clockMax = st.clocks.length ? Math.max(...st.clocks) : null;
    state.lastStress = {
      startedAt: st.startedAt.toISOString(),
      seconds: elapsed,
      cpu: st.useCpu,
      gpu: st.useGpu,
      threads: st.threads || 0,
      baseline: st.baseline,
      finalScore,
      throttlePct,
      cpuTempStart: st.cpuTempStart,
      cpuTempMax: st.cpuTempMax,
      gpuTempMax: st.gpuTempMax,
      fpsAvg: avg(st.fps.slice(3)),
      fpsMin: st.fps.length > 3 ? Math.min(...st.fps.slice(3)) : null,
      gpuPassesMax: st.gpuPassesMax || null,
      clockMin,
      clockMax,
      stoppedBy: reason,
    };
    const verdict = stressVerdict(state.lastStress);
    setPill($("stress-status"), verdict.label, verdict.kind);
    const r = $("stress-result");
    r.hidden = false;
    r.innerHTML = `<strong>Result (${Math.floor(elapsed / 60)}m ${elapsed % 60}s):</strong> ${esc(verdict.text)}`;
  }

  function stressVerdict(s) {
    const notes = [];
    let kind = "ok";
    const worse = (k) => (kind = kind === "bad" || k === "bad" ? "bad" : "warn");
    if (s.cpuTempMax != null) {
      notes.push(`CPU peaked at ${fmt(s.cpuTempMax)}\u00b0C`);
      if (s.cpuTempMax >= 95) worse("bad");
      else if (s.cpuTempMax >= 85) worse("warn");
    }
    if (s.gpuTempMax != null) {
      notes.push(`GPU peaked at ${fmt(s.gpuTempMax)}\u00b0C`);
      if (s.gpuTempMax >= 90) worse("bad");
      else if (s.gpuTempMax >= 84) worse("warn");
    }
    if (s.throttlePct != null) {
      notes.push(`CPU performance dropped ${fmt(s.throttlePct)}% from the start`);
      if (s.throttlePct >= 25) worse("bad");
      else if (s.throttlePct >= 10) worse("warn");
    }
    if (s.fpsAvg != null) notes.push(`GPU averaged ${fmt(s.fpsAvg)} FPS`);
    if (s.seconds < 60) notes.push("ran under a minute, which is too short to judge cooling");
    const label = kind === "ok" ? "Passed" : kind === "warn" ? "Check cooling" : "Overheating / throttling";
    return { kind, label, text: (notes.join("; ") || "No sensor data was recorded") + "." };
  }

  // ---------------------------------------------------------------- 1 s tick

  function tick() {
    const now = performance.now();
    const st = state.stress;
    let score = null;
    let fps = null;
    if (st) {
      const dt = (now - st.lastTick) / 1000;
      st.lastTick = now;
      const elapsed = (now - st.t0) / 1000;
      if (st.useCpu) {
        score = st.ops / 1e6 / dt;
        st.ops = 0;
        st.scores.push(score);
        if (!st.baseline && elapsed >= 30) st.baseline = avg(st.scores.slice(5, 30));
      }
      if (st.useGpu) {
        fps = gpuLoad.takeFrames() / dt;
        st.fps.push(fps);
        st.gpuPasses = gpuLoad.adjust(fps);
        st.gpuPassesMax = Math.max(st.gpuPassesMax || 0, st.gpuPasses);
      }
      if (st.duration && elapsed >= st.duration) stopStress("timer");
    }

    const s = state.sensors;
    if (state.agent || st) {
      state.history.push({
        cpuTemp: num(s && s.cpuTemp && s.cpuTemp.value),
        gpuTemp: num(arr(s && s.gpus).map((g) => num(g.temp)).filter((v) => v != null).sort((a, b) => b - a)[0]),
        load: num(s && s.cpu && s.cpu.load),
        clock: num(s && s.cpu && s.cpu.clockMHz),
        score,
        baseline: st ? st.baseline : null,
      });
      if (state.history.length > HISTORY_LIMIT) state.history.shift();
    }
    renderStats(score, fps);
    drawCharts();
  }

  function setStat(id, value, small, kind) {
    const el = $(id);
    el.querySelector("strong").textContent = value;
    if (small != null) el.querySelector("small").textContent = small;
    el.className = "tool-stat" + (kind ? ` tool-stat--${kind}` : "");
  }

  const tempKind = (v, warn, bad) => (v == null ? "" : v >= bad ? "bad" : v >= warn ? "warn" : "ok");

  function renderStats(score, fps) {
    const s = state.sensors;
    const st = state.stress;
    const cpuT = num(s && s.cpuTemp && s.cpuTemp.value);
    const approx = s && s.cpuTemp && /approximate/i.test(s.cpuTemp.source);
    setStat(
      "st-cputemp",
      cpuT == null ? "\u2013" : `${fmt(cpuT)}\u00b0C`,
      cpuT == null ? (state.agent ? "no CPU sensor found" : "needs agent") : `max ${fmt(state.maxCpuTemp)}\u00b0C${approx ? " \u00b7 approx." : ""}`,
      tempKind(cpuT, 85, 95)
    );
    const gpuT = state.history.length ? state.history[state.history.length - 1].gpuTemp : null;
    setStat(
      "st-gputemp",
      gpuT == null ? "\u2013" : `${fmt(gpuT)}\u00b0C`,
      gpuT == null ? (state.agent ? "no GPU sensor found" : "needs agent") : `max ${fmt(state.maxGpuTemp)}\u00b0C`,
      tempKind(gpuT, 84, 90)
    );
    const load = num(s && s.cpu && s.cpu.load);
    setStat("st-load", load == null ? "\u2013" : `${load}%`, s && s.memory ? `RAM ${s.memory.usedPct}% used` : "\u00a0");
    const clock = num(s && s.cpu && s.cpu.clockMHz);
    setStat(
      "st-clock",
      clock == null ? "\u2013" : `${(clock / 1000).toFixed(2)} GHz`,
      state.maxClock ? `peak ${(state.maxClock / 1000).toFixed(2)} GHz` : "\u00a0"
    );
    if (st && st.useCpu) setStat("st-score", score == null ? "\u2013" : fmt(score), `${st.threads} threads \u00b7 Mops/s`);
    if (st && st.useCpu) {
      const recent = avg(st.scores.slice(-10));
      if (st.baseline && recent != null) {
        const drop = Math.max(0, (1 - recent / st.baseline) * 100);
        setStat("st-throttle", `${fmt(drop)}%`, "drop vs first 30 s", drop >= 25 ? "bad" : drop >= 10 ? "warn" : "ok");
      } else {
        setStat("st-throttle", "\u2026", "measuring baseline");
      }
    }
    if (st && st.useGpu) setStat("st-fps", fps == null ? "\u2013" : fmt(fps), `load level ${st.gpuPasses || 1}\u00d7 (aims for ~30 FPS)`);
    if (st) {
      const e = Math.floor((performance.now() - st.t0) / 1000);
      const left = st.duration ? Math.max(0, st.duration - e) : null;
      setStat("st-time", `${Math.floor(e / 60)}:${String(e % 60).padStart(2, "0")}`, left == null ? "until stopped" : `${Math.ceil(left / 60)} min left`);
    }
  }

  // ---------------------------------------------------------------- charts

  function drawChart(canvas, series, opts) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const values = series.flatMap((s) => s.values.filter((v) => v != null));
    let max = opts.max;
    if (values.length) max = Math.max(max, Math.ceil((Math.max(...values) + 1) / 20) * 20);
    const min = opts.min;
    const L = 38, R = 10, T = 10, B = 20;
    const pw = w - L - R;
    const ph = h - T - B;

    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "#53757b";
    ctx.strokeStyle = "rgba(7, 39, 45, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const v = min + ((max - min) * i) / 4;
      const y = T + ph - (ph * i) / 4;
      ctx.beginPath();
      ctx.moveTo(L, Math.round(y) + 0.5);
      ctx.lineTo(w - R, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(Math.round(v) + (opts.unit || ""), L - 6, y);
    }

    const n = Math.max(60, ...series.map((s) => s.values.length));
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(n >= 120 ? `last ${Math.round(n / 60)} min` : `last ${n} s`, L, T + ph + 5);

    if (!values.length) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(opts.empty, L + pw / 2, T + ph / 2);
      return;
    }

    for (const s of series) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      let drawing = false;
      s.values.forEach((v, i) => {
        if (v == null) {
          drawing = false;
          return;
        }
        const x = L + (pw * i) / Math.max(1, n - 1);
        const y = T + ph - (ph * (Math.min(max, Math.max(min, v)) - min)) / (max - min);
        if (drawing) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        drawing = true;
      });
      ctx.stroke();
    }
  }

  function drawCharts() {
    const h = state.history;
    drawChart(
      $("chart-temp"),
      [
        { color: COLORS.cpuTemp, values: h.map((p) => p.cpuTemp) },
        { color: COLORS.gpuTemp, values: h.map((p) => p.gpuTemp) },
      ],
      { min: 20, max: 100, unit: "\u00b0", empty: state.agent ? "Waiting for temperature readings\u2026" : "Start the agent to see temperatures" }
    );
    drawChart(
      $("chart-load"),
      [
        { color: COLORS.load, values: h.map((p) => p.load) },
        { color: COLORS.clock, values: h.map((p) => (p.clock && state.maxClock ? (p.clock / state.maxClock) * 100 : null)) },
        { color: COLORS.score, values: h.map((p) => (p.score != null && p.baseline ? (p.score / p.baseline) * 100 : null)) },
      ],
      { min: 0, max: 100, unit: "%", empty: "Start the stress test or the agent" }
    );
  }

  // ---------------------------------------------------------------- render: overview

  function spec(title, main, small) {
    return `<div class="hc-spec"><h3>${esc(title)}</h3><p>${main}</p>${small ? `<small>${small}</small>` : ""}</div>`;
  }

  function renderOverview() {
    const b = state.browser;
    const i = state.info;
    const out = [];
    if (i) {
      const sys = i.system || {};
      const board = i.board || {};
      const model = [clean(sys.manufacturer), clean(sys.model)].filter(Boolean).join(" ") || [clean(board.manufacturer), clean(board.product)].filter(Boolean).join(" ") || "Unknown";
      out.push(spec("Device", esc(model), [clean(sys.family), clean(sys.serial) && `S/N ${esc(clean(sys.serial))}`, esc(i.computerName)].filter(Boolean).join(" \u00b7 ")));
      const os = i.os || {};
      out.push(spec("Windows", esc(`${os.name || ""} (build ${os.build || "?"})`), `Installed ${fmtDay(os.installDate)} \u00b7 last boot ${fmtDate(os.lastBoot)}`));
      for (const c of arr(i.cpus)) out.push(spec("Processor", esc(c.name), `${c.cores} cores / ${c.threads} threads \u00b7 base ${fmt(c.maxMHz / 1000, 2)} GHz`));
      for (const g of arr(i.gpus)) {
        out.push(spec("Graphics", esc(g.name), [g.vramGB ? `${g.vramGB} GB` : "", g.driver && `driver ${esc(g.driver)} (${fmtDay(g.driverDate)})`, esc(g.resolution)].filter(Boolean).join(" \u00b7 ")));
      }
      const mods = arr(i.memory);
      const modText = mods.map((m) => `${esc(m.slot)}: ${m.sizeGB} GB ${esc(m.type || "")} ${m.configuredMTs || m.speedMTs || ""} MT/s ${esc(m.manufacturer)} ${esc(m.part)}`).join("<br />");
      out.push(spec("Memory", `${fmt(sys.totalRamGB, 0)} GB${mods.length ? ` in ${mods.length} module${mods.length > 1 ? "s" : ""}` : ""}`, modText));
      for (const d of arr(i.disks)) out.push(spec("Drive", esc(d.name), `${d.sizeGB} GB \u00b7 ${esc(d.bus)} ${esc(d.media)} \u00b7 ${esc(d.health)}`));
      out.push(spec("Motherboard / BIOS", esc([clean(board.manufacturer), clean(board.product)].filter(Boolean).join(" ") || "\u2013"), `BIOS ${esc(i.bios && i.bios.version)} (${fmtDay(i.bios && i.bios.date)})`));
      const nets = arr(i.network);
      if (nets.length) out.push(spec("Network", nets.map((n) => esc(n.name)).join("<br />"), nets.map((n) => `${esc(n.status)}${n.status === "Up" ? ` ${esc(n.speed)}` : ""}`).join(" \u00b7 ")));
    } else {
      out.push(spec("Windows", esc(b.os || "Unknown"), esc(b.arch ? `${b.arch} \u00b7 ${b.browser || ""}` : b.browser || "")));
      out.push(spec("Processor", b.threads ? `${b.threads} threads` : "\u2013", "Model name needs the agent"));
      out.push(spec("Graphics", esc(b.gpu || "Unknown"), "Reported by the browser"));
      out.push(spec("Memory", b.memoryGB ? `${b.memoryGB}+ GB` : "\u2013", "Browsers cap this at 8 GB; the agent shows the real amount"));
    }
    out.push(spec("Display", esc(b.screen || "\u2013"), "Current screen as seen by the browser"));
    $("overview").innerHTML = out.join("");
  }

  // ---------------------------------------------------------------- render: battery

  function batteryVerdict(pct) {
    if (pct == null) return { kind: "", text: "Wear not reported" };
    if (pct >= 80) return { kind: "ok", text: "Good" };
    if (pct >= 60) return { kind: "warn", text: "Worn \u2013 replacement worth considering" };
    return { kind: "bad", text: "Replace battery" };
  }

  function renderBattery() {
    const el = $("battery");
    const bats = arr(state.info && state.info.batteries);
    if (state.info && !bats.length) {
      el.innerHTML = `<div class="tool-empty">No battery detected. This looks like a desktop PC.</div>`;
      return;
    }
    if (!state.info) {
      const b = state.browser.battery;
      el.innerHTML = b
        ? `<div class="tool-stats"><div class="tool-stat"><span>Charge</span><strong>${b.level}%</strong><small>${b.charging ? "charging" : "on battery"}</small></div></div>
           <p class="tool-note">Battery wear (design vs current capacity) and cycle count need the agent.</p>`
        : `<div class="tool-empty">Battery health needs the agent.</div>`;
      return;
    }
    el.innerHTML = bats
      .map((b, idx) => {
        const v = batteryVerdict(num(b.healthPct));
        const pct = num(b.healthPct);
        return `
          <div class="tool-stats">
            <div class="tool-stat tool-stat--${v.kind}"><span>Health</span><strong>${pct == null ? "\u2013" : `${fmt(pct)}%`}</strong><small>${esc(v.text)}</small></div>
            <div class="tool-stat"><span>Full charge</span><strong>${fmt(b.fullMWh / 1000, 1)} Wh</strong><small>design ${fmt(b.designMWh / 1000, 1)} Wh</small></div>
            <div class="tool-stat"><span>Cycles</span><strong>${b.cycleCount == null || b.cycleCount === 0 ? "\u2013" : b.cycleCount}</strong><small>${b.cycleCount ? "charge cycles" : "not reported"}</small></div>
            <div class="tool-stat" data-battery-live="${idx}"><span>Charge now</span><strong>\u2013</strong><small>&nbsp;</small></div>
          </div>
          <div class="hc-bar ${v.kind === "warn" ? "is-warn" : v.kind === "bad" ? "is-bad" : ""}"><i style="width:${Math.min(100, pct || 0)}%"></i></div>
          <p class="tool-note">${esc([b.manufacturer, b.name, b.chemistry, b.serial && `S/N ${b.serial}`].filter(Boolean).join(" \u00b7 "))}</p>`;
      })
      .join("");
    renderBatteryLive();
  }

  function renderBatteryLive() {
    const live = state.sensors && state.sensors.battery;
    const el = document.querySelector('[data-battery-live="0"]');
    if (!el || !live) return;
    el.querySelector("strong").textContent = live.percent == null ? "\u2013" : `${live.percent}%`;
    let note = live.pluggedIn ? (live.charging ? "plugged in, charging" : "plugged in") : "on battery";
    if (live.rateW) note += ` \u00b7 ${live.rateW > 0 ? "+" : ""}${live.rateW} W`;
    el.querySelector("small").textContent = note;
  }

  // ---------------------------------------------------------------- render: storage

  function renderStorage() {
    const i = state.info;
    if (!i) return;
    const disks = arr(i.disks);
    const vols = arr(i.volumes);
    let html = "";
    if (disks.length) {
      html += `<div class="tool-table-wrap"><table class="tool-table"><thead><tr><th>Drive</th><th>Health</th><th>Temp</th><th>Wear</th><th>Power-on</th><th>Errors</th></tr></thead><tbody>`;
      for (const d of disks) {
        const bad = d.health && d.health !== "Healthy";
        const wear = num(d.wearPct);
        const errs = [d.readErrors, d.writeErrors, d.uncorrected].map(num).filter((v) => v != null);
        html += `<tr>
          <td><strong>${esc(d.name)}</strong><br /><small>${d.sizeGB} GB ${esc(d.bus)} ${esc(d.media)}</small></td>
          <td><span class="tool-pill tool-pill--${bad ? "bad" : "ok"}">${esc(d.health || "?")}</span></td>
          <td class="num">${d.tempC != null ? `${d.tempC}\u00b0C` : "\u2013"}${d.tempMaxC ? `<br /><small>max ${d.tempMaxC}\u00b0C</small>` : ""}</td>
          <td class="num">${wear == null ? "\u2013" : `<span class="tool-pill tool-pill--${wear >= 90 ? "bad" : wear >= 70 ? "warn" : "ok"}">${wear}% used</span>`}</td>
          <td class="num">${d.powerOnHours != null ? `${Number(d.powerOnHours).toLocaleString()} h` : "\u2013"}</td>
          <td class="num">${errs.length ? errs.reduce((a, b) => a + b, 0) : "\u2013"}</td>
        </tr>`;
      }
      html += `</tbody></table></div>`;
    }
    if (vols.length) {
      html += `<div class="tool-table-wrap" style="margin-top: 0.8rem"><table class="tool-table"><thead><tr><th>Volume</th><th>Size</th><th>Free</th></tr></thead><tbody>`;
      for (const v of vols) {
        const pct = v.sizeGB ? (v.freeGB / v.sizeGB) * 100 : null;
        html += `<tr><td>${esc(v.letter)} ${esc(v.label)}</td><td class="num">${v.sizeGB} GB</td>
          <td class="num"><span class="tool-pill tool-pill--${pct != null && pct < 10 ? "bad" : pct != null && pct < 20 ? "warn" : "ok"}">${v.freeGB} GB (${fmt(pct)}%)</span></td></tr>`;
      }
      html += `</tbody></table></div>`;
    }
    if (!i.isAdmin) html += `<p class="tool-note" style="margin-top: 0.8rem">Temperature, wear and error counters need the agent to run as administrator.</p>`;
    $("storage").innerHTML = html || `<div class="tool-empty">No drives reported.</div>`;
  }

  function renderSensorTable() {
    const s = state.sensors;
    if (!s) return;
    const rows = [];
    for (const t of arr(s.temps)) rows.push([t.name, `${fmt(t.value, 1)}\u00b0C`, t.source]);
    for (const g of arr(s.gpus)) {
      const parts = [g.load != null && `${fmt(g.load)}% load`, g.clockMHz && `${fmt(g.clockMHz)} MHz`, g.powerW && `${fmt(g.powerW, 1)} W`].filter(Boolean);
      if (g.temp != null) rows.push([`${g.name}`, `${fmt(g.temp)}\u00b0C${parts.length ? ` \u00b7 ${parts.join(" \u00b7 ")}` : ""}`, g.source]);
    }
    for (const f of arr(s.fans)) rows.push([f.name, `${f.rpm} RPM`, "LibreHardwareMonitor"]);
    if (!rows.length) {
      $("sensor-table").innerHTML = `<div class="tool-empty">No temperature sensors exposed by Windows. Run LibreHardwareMonitor as administrator for CPU and fan readings.</div>`;
      return;
    }
    let note = "";
    if (!arr(s.sources).includes("LibreHardwareMonitor")) {
      note = `<p class="tool-note" style="margin-top: 0.6rem">ACPI thermal zones are motherboard sensors, not the CPU die. For true CPU package temperature run LibreHardwareMonitor as administrator.</p>`;
    }
    $("sensor-table").innerHTML =
      `<div class="tool-table-wrap"><table class="tool-table"><thead><tr><th>Sensor</th><th>Reading</th><th>Source</th></tr></thead><tbody>` +
      rows.map((r) => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("") +
      `</tbody></table></div>${note}`;
  }

  // ---------------------------------------------------------------- render: errors

  const CATEGORIES = {
    bsod: ["Blue screens", "Windows crashed and restarted (BugCheck). Often drivers, RAM or overheating."],
    power: ["Unexpected shutdowns", "Power was lost or the PC was forced off (Kernel-Power 41 / 6008)."],
    hardware: ["Hardware errors (WHEA)", "The CPU, memory or PCIe bus reported a hardware fault."],
    storage: ["Disk errors", "Bad blocks, controller resets or file-system damage."],
    gpu: ["Graphics driver resets", "The display driver stopped responding and recovered."],
    app: ["App errors", "Programs that crashed or reported errors."],
    system: ["Other system errors", "Services and drivers that logged an error."],
  };

  async function loadErrors() {
    if (!state.agent) return;
    $("errors").innerHTML = `<div class="tool-empty">Reading event logs\u2026</div>`;
    try {
      state.errors = await agentFetch(`/errors?days=${$("errors-days").value}`, 90000);
    } catch (e) {
      $("errors").innerHTML = `<div class="tool-empty">Could not read the event logs (${esc(e.message)}).</div>`;
      return;
    }
    renderErrors();
  }

  function renderErrors() {
    const data = state.errors;
    if (!data) return;
    const counts = data.counts || {};
    const pill = $("stability-pill");
    if (data.stability != null) {
      const s = Number(data.stability);
      pill.hidden = false;
      setPill(pill, `Stability ${s.toFixed(1)} / 10`, s >= 8 ? "ok" : s >= 5 ? "warn" : "bad");
    }
    $("error-chips").innerHTML = Object.entries(CATEGORIES)
      .map(([key, [label, help]]) => {
        const n = counts[key] || 0;
        const highlight = n > 0 && key !== "app" && key !== "system";
        return `<button type="button" class="hc-chip${highlight ? " has-items" : ""}${state.errorFilter === key ? " is-active" : ""}" data-cat="${key}" title="${esc(help)}">${esc(label)} <b>${n}</b></button>`;
      })
      .join("");

    const events = arr(data.events).filter((e) => !state.errorFilter || e.category === state.errorFilter);
    let html = "";
    const dumps = arr(data.minidumps);
    if (dumps.length) {
      html += `<p class="tool-note"><strong>${dumps.length} crash dump file${dumps.length > 1 ? "s" : ""}</strong> in C:\\Windows\\Minidump: ${dumps
        .slice(0, 5)
        .map((d) => `${esc(d.name)} (${fmtDate(d.time)})`)
        .join(", ")}${dumps.length > 5 ? "\u2026" : ""}</p>`;
    }
    if (state.errorFilter) html += `<p class="tool-note">${esc(CATEGORIES[state.errorFilter][1])}</p>`;
    if (!events.length) {
      html += `<div class="tool-empty">No ${state.errorFilter ? esc(CATEGORIES[state.errorFilter][0].toLowerCase()) : "errors"} in the last ${data.days} days.</div>`;
    } else {
      html += `<div class="tool-table-wrap"><table class="tool-table"><thead><tr><th>Time</th><th>Type</th><th>Source</th><th>Details</th></tr></thead><tbody>`;
      for (const e of events.slice(0, 150)) {
        const first = (e.message || "").split(/\r?\n/)[0] || "(no message)";
        html += `<tr>
          <td class="num">${fmtDate(e.time)}</td>
          <td>${esc(CATEGORIES[e.category] ? CATEGORIES[e.category][0] : e.category)}</td>
          <td>${esc(e.provider)}<br /><small>ID ${esc(e.id)} \u00b7 ${esc(e.log)}</small></td>
          <td><details class="hc-event-msg"><summary>${esc(first.slice(0, 140))}</summary>${esc(e.message)}</details></td>
        </tr>`;
      }
      html += `</tbody></table></div>`;
      if (events.length > 150) html += `<p class="tool-note" style="margin-top: 0.6rem">Showing 150 of ${events.length}. The full list is in the downloaded report.</p>`;
    }
    $("errors").innerHTML = html;
  }

  // ---------------------------------------------------------------- report

  function findings() {
    const out = [];
    const i = state.info;
    for (const b of arr(i && i.batteries)) {
      const v = batteryVerdict(num(b.healthPct));
      if (v.kind) out.push([v.kind, `Battery health ${fmt(b.healthPct)}% (${fmt(b.fullMWh / 1000, 1)} of ${fmt(b.designMWh / 1000, 1)} Wh) \u2013 ${v.text}`]);
    }
    for (const d of arr(i && i.disks)) {
      if (d.health && d.health !== "Healthy") out.push(["bad", `Drive ${d.name} reports ${d.health}`]);
      if (num(d.wearPct) >= 70) out.push([num(d.wearPct) >= 90 ? "bad" : "warn", `Drive ${d.name} is ${d.wearPct}% worn`]);
    }
    for (const v of arr(i && i.volumes)) {
      if (v.sizeGB && v.freeGB / v.sizeGB < 0.1) out.push(["warn", `${v.letter} has only ${v.freeGB} GB free`]);
    }
    if (state.lastStress) {
      const v = stressVerdict(state.lastStress);
      out.push([v.kind, `Stress test: ${v.text}`]);
    }
    const c = (state.errors && state.errors.counts) || {};
    if (c.bsod) out.push(["bad", `${c.bsod} blue screen crash(es) in the last ${state.errors.days} days`]);
    if (c.hardware) out.push(["bad", `${c.hardware} WHEA hardware error(s) logged`]);
    if (c.storage) out.push(["warn", `${c.storage} disk / storage error(s) logged`]);
    if (c.power) out.push(["warn", `${c.power} unexpected shutdown(s)`]);
    if (c.gpu) out.push(["warn", `${c.gpu} graphics driver reset(s)`]);
    if (!out.length) out.push(["ok", "No problems detected by the checks that ran."]);
    return out;
  }

  function buildReport() {
    const i = state.info;
    const s = state.lastStress;
    const e = state.errors;
    const now = new Date();
    const row = (k, v) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`;
    const section = (title, body) => `<h2>${esc(title)}</h2>${body}`;
    let specs = "";
    if (i) {
      const sys = i.system || {};
      specs += row("Device", esc([clean(sys.manufacturer), clean(sys.model)].filter(Boolean).join(" ")));
      specs += row("Serial number", esc(clean(sys.serial) || "\u2013"));
      specs += row("Computer name", esc(i.computerName));
      specs += row("Windows", esc(`${i.os.name} ${i.os.arch} build ${i.os.build}`));
      for (const c of arr(i.cpus)) specs += row("Processor", esc(`${c.name} (${c.cores}C/${c.threads}T)`));
      for (const g of arr(i.gpus)) specs += row("Graphics", esc(`${g.name}${g.vramGB ? ` ${g.vramGB} GB` : ""} \u00b7 driver ${g.driver}`));
      specs += row("Memory", esc(`${fmt(sys.totalRamGB, 0)} GB`) + "<br />" + arr(i.memory).map((m) => esc(`${m.slot}: ${m.sizeGB} GB ${m.type || ""} ${m.configuredMTs || m.speedMTs} MT/s ${m.manufacturer} ${m.part}`)).join("<br />"));
      for (const d of arr(i.disks)) specs += row("Drive", esc(`${d.name} \u00b7 ${d.sizeGB} GB ${d.bus} ${d.media} \u00b7 ${d.health}${d.wearPct != null ? ` \u00b7 ${d.wearPct}% worn` : ""}${d.powerOnHours != null ? ` \u00b7 ${d.powerOnHours} h` : ""}${d.tempC != null ? ` \u00b7 ${d.tempC}\u00b0C` : ""}`));
      specs += row("Motherboard", esc(`${clean(i.board.manufacturer)} ${clean(i.board.product)} \u00b7 BIOS ${i.bios.version} (${fmtDay(i.bios.date)})`));
    } else {
      const b = state.browser;
      specs += row("Windows", esc(b.os));
      specs += row("Processor threads", esc(b.threads));
      specs += row("Graphics", esc(b.gpu));
      specs += row("Note", "Agent was not connected; details are limited to what the browser reports.");
    }

    let battery = "";
    for (const b of arr(i && i.batteries)) {
      battery += `<table>${row("Battery", esc([b.manufacturer, b.name, b.chemistry].filter(Boolean).join(" ")))}${row("Health", `${fmt(b.healthPct)}% \u2013 ${esc(batteryVerdict(num(b.healthPct)).text)}`)}${row("Capacity", `${fmt(b.fullMWh / 1000, 1)} Wh of ${fmt(b.designMWh / 1000, 1)} Wh design`)}${row("Cycle count", b.cycleCount || "not reported")}</table>`;
    }

    let stress = "<p>No stress test was run.</p>";
    if (s) {
      stress = `<table>
        ${row("Started", fmtDate(s.startedAt))}
        ${row("Duration", `${Math.floor(s.seconds / 60)} min ${s.seconds % 60} s`)}
        ${row("Load", [s.cpu && `CPU (${s.threads} threads)`, s.gpu && "GPU (WebGL)"].filter(Boolean).join(" + "))}
        ${row("CPU temperature", s.cpuTempMax != null ? `${fmt(s.cpuTempStart)}\u00b0C at start, ${fmt(s.cpuTempMax)}\u00b0C peak` : "not available")}
        ${row("GPU temperature", s.gpuTempMax != null ? `${fmt(s.gpuTempMax)}\u00b0C peak` : "not available")}
        ${row("CPU clock", s.clockMax ? `${fmt(s.clockMin)}\u2013${fmt(s.clockMax)} MHz` : "not available")}
        ${row("CPU score", s.baseline ? `${fmt(s.baseline)} Mops/s baseline, ${fmt(s.finalScore)} at end (${fmt(s.throttlePct)}% drop)` : s.finalScore != null ? `${fmt(s.finalScore)} Mops/s` : "\u2013")}
        ${row("GPU load", s.fpsAvg != null ? `${fmt(s.fpsAvg)} FPS average, ${fmt(s.fpsMin)} minimum, peak load level ${s.gpuPassesMax || 1}\u00d7` : "\u2013")}
        ${row("Result", esc(stressVerdict(s).text))}
      </table>`;
    }

    let errors = "<p>Event logs were not read (agent not connected).</p>";
    if (e) {
      const c = e.counts || {};
      errors = `<table>${Object.entries(CATEGORIES)
        .map(([k, [label]]) => row(label, c[k] || 0))
        .join("")}${e.stability != null ? row("Reliability index", `${e.stability} / 10`) : ""}${row("Crash dumps", arr(e.minidumps).length ? arr(e.minidumps).map((d) => esc(`${d.name} (${fmtDate(d.time)})`)).join("<br />") : "none")}</table>`;
      const important = arr(e.events).filter((x) => x.category !== "app" && x.category !== "system");
      const rest = arr(e.events).filter((x) => x.category === "app" || x.category === "system");
      const list = important.concat(rest).slice(0, 120);
      if (list.length) {
        errors += `<h3>Events (hardware-related first)</h3><table class="events"><tr><th>Time</th><th>Type</th><th>Source</th><th>Message</th></tr>${list
          .map((x) => `<tr><td>${fmtDate(x.time)}</td><td>${esc(CATEGORIES[x.category] ? CATEGORIES[x.category][0] : x.category)}</td><td>${esc(x.provider)} #${esc(x.id)}</td><td>${esc((x.message || "").slice(0, 400))}</td></tr>`)
          .join("")}</table>`;
      }
    }

    const job = $("report-job").value.trim();
    const customer = $("report-customer").value.trim();
    const notes = $("report-notes").value.trim();
    const findingsHtml = findings()
      .map(([k, t]) => `<li class="${k}">${esc(t)}</li>`)
      .join("");

    return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>TECHM8 PC Health Report${job ? ` - ${esc(job)}` : ""}</title>
<style>
body{font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#07272d;max-width:960px;margin:0 auto;padding:24px;background:#fff}
h1{margin:0 0 4px;font-size:26px}h2{margin:28px 0 8px;font-size:18px;border-bottom:2px solid #16c8ba;padding-bottom:4px}h3{font-size:15px;margin:18px 0 6px}
.meta{color:#53757b;margin:0 0 12px}table{width:100%;border-collapse:collapse;margin:0 0 8px}th,td{padding:6px 8px;border-bottom:1px solid #dfe9e8;text-align:left;vertical-align:top}
th{width:28%;color:#53757b;font-weight:600}.events th{width:auto}.events td{font-size:12px}
ul.f{padding-left:0;list-style:none}ul.f li{padding:6px 10px;margin:4px 0;border-radius:6px;border-left:4px solid}
li.ok{background:#e9f8ef;border-color:#13804a}li.warn{background:#fdf3e2;border-color:#e69614}li.bad{background:#fbe9e7;border-color:#c0392b}
.notes{white-space:pre-wrap;background:#f4faf9;padding:10px;border-radius:6px}@media print{body{padding:0}}
</style></head><body>
<h1>TECHM8 PC Health Report</h1>
<p class="meta">${esc(now.toLocaleString("en-AU"))}${job ? ` \u00b7 Job ${esc(job)}` : ""}${customer ? ` \u00b7 ${esc(customer)}` : ""} \u00b7 techm8australia.com</p>
${notes ? `<p class="notes">${esc(notes)}</p>` : ""}
${section("Summary", `<ul class="f">${findingsHtml}</ul>`)}
${section("System", `<table>${specs}</table>`)}
${battery ? section("Battery", battery) : ""}
${section("Stress test", stress)}
${section("Errors and crashes", errors)}
</body></html>`;
  }

  function downloadReport() {
    const html = buildReport();
    const sys = state.info && state.info.system;
    const name = [
      "TECHM8-PC-Report",
      $("report-job").value.trim(),
      sys && clean(sys.model),
      new Date().toLocaleDateString("en-CA"),
    ]
      .filter(Boolean)
      .join("-")
      .replace(/[^\w.-]+/g, "_");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = `${name}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // ---------------------------------------------------------------- wiring

  $("copy-command").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText($("agent-command").textContent);
      btn.textContent = "Copied";
    } catch (err) {
      const range = document.createRange();
      range.selectNodeContents($("agent-command"));
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      btn.textContent = "Press Ctrl+C";
    }
    setTimeout(() => (btn.textContent = "Copy"), 2500);
    connect();
  });
  $("agent-connect").addEventListener("click", connect);
  $("stress-start").addEventListener("click", startStress);
  $("stress-stop").addEventListener("click", () => stopStress("user"));
  $("errors-refresh").addEventListener("click", loadErrors);
  $("errors-days").addEventListener("change", loadErrors);
  $("open-reliability").addEventListener("click", () => agentFetch("/open/reliability").catch(() => {}));
  $("battery-report").addEventListener("click", () => window.open(`${AGENT}/battery-report`, "_blank", "noopener"));
  $("report-download").addEventListener("click", downloadReport);
  $("error-chips").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-cat]");
    if (!chip) return;
    state.errorFilter = state.errorFilter === chip.dataset.cat ? null : chip.dataset.cat;
    renderErrors();
  });
  window.addEventListener("resize", drawCharts);
  window.addEventListener("beforeunload", (e) => {
    if (state.stress) e.preventDefault();
  });

  (async () => {
    await collectBrowserInfo();
    renderOverview();
    renderBattery();
    drawCharts();
    setInterval(tick, 1000);
    // Connect straight away only if the browser already allows local access,
    // so ordinary visitors never see a permission prompt on page load.
    try {
      const perm = await navigator.permissions.query({ name: "local-network-access" });
      if (perm.state === "granted") connect();
    } catch (e) {
      // Browsers without that permission name: try the agent once, silently.
      agentFetch("/ping", 1500).then(connect, () => {});
    }
  })();
})();
