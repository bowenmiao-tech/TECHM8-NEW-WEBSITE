// Keyboard Tester (keyboard-tester.html).
// Keys are placed on a grid measured in key units (u). Each key is tracked by
// KeyboardEvent.code, which names the physical key regardless of language layout.
(function () {
  "use strict";

  const CHATTER_MS = 40;
  const LOG_LIMIT = 60;

  const keys = [];

  function row(block, y, x, items) {
    for (const item of items) {
      if (typeof item === "number") {
        x += item;
        continue;
      }
      const [code, label, w = 1, h = 1] = item;
      keys.push({ code, label, block, x, y, w, h });
      x += w;
    }
  }

  const letters = (s) => s.split("").map((c) => ["Key" + c, c]);
  const digits = "1234567890".split("").map((d) => ["Digit" + d, d]);
  const fkeys = (from, to) => {
    const out = [];
    for (let i = from; i <= to; i += 1) out.push(["F" + i, "F" + i]);
    return out;
  };

  // Main block: 15u wide. The function row sits 0.5u above the rest.
  row("main", 0, 0, [["Escape", "Esc"], 1, ...fkeys(1, 4), 0.5, ...fkeys(5, 8), 0.5, ...fkeys(9, 12)]);
  row("main", 1.5, 0, [["Backquote", "`"], ...digits, ["Minus", "-"], ["Equal", "="], ["Backspace", "Backspace", 2]]);
  row("main", 2.5, 0, [["Tab", "Tab", 1.5], ...letters("QWERTYUIOP"), ["BracketLeft", "["], ["BracketRight", "]"], ["Backslash", "\\", 1.5]]);
  row("main", 3.5, 0, [["CapsLock", "Caps", 1.75], ...letters("ASDFGHJKL"), ["Semicolon", ";"], ["Quote", "'"], ["Enter", "Enter", 2.25]]);
  row("main", 4.5, 0, [["ShiftLeft", "Shift", 2.25], ...letters("ZXCVBNM"), ["Comma", ","], ["Period", "."], ["Slash", "/"], ["ShiftRight", "Shift", 2.75]]);
  row("main", 5.5, 0, [
    ["ControlLeft", "Ctrl", 1.25],
    ["MetaLeft", "Win", 1.25],
    ["AltLeft", "Alt", 1.25],
    ["Space", "Space", 6.25],
    ["AltRight", "Alt", 1.25],
    ["MetaRight", "Win", 1.25],
    ["ContextMenu", "Menu", 1.25],
    ["ControlRight", "Ctrl", 1.25],
  ]);

  // Navigation cluster: 3u wide, starting at 15.5u.
  row("nav", 0, 15.5, [["PrintScreen", "PrtSc"], ["ScrollLock", "ScrLk"], ["Pause", "Pause"]]);
  row("nav", 1.5, 15.5, [["Insert", "Ins"], ["Home", "Home"], ["PageUp", "PgUp"]]);
  row("nav", 2.5, 15.5, [["Delete", "Del"], ["End", "End"], ["PageDown", "PgDn"]]);
  row("nav", 4.5, 16.5, [["ArrowUp", "↑"]]);
  row("nav", 5.5, 15.5, [["ArrowLeft", "←"], ["ArrowDown", "↓"], ["ArrowRight", "→"]]);

  // Numpad: 4u wide, starting at 19u. Plus and Enter are two rows tall.
  row("numpad", 1.5, 19, [["NumLock", "Num"], ["NumpadDivide", "/"], ["NumpadMultiply", "*"], ["NumpadSubtract", "-"]]);
  row("numpad", 2.5, 19, [["Numpad7", "7"], ["Numpad8", "8"], ["Numpad9", "9"], ["NumpadAdd", "+", 1, 2]]);
  row("numpad", 3.5, 19, [["Numpad4", "4"], ["Numpad5", "5"], ["Numpad6", "6"]]);
  row("numpad", 4.5, 19, [["Numpad1", "1"], ["Numpad2", "2"], ["Numpad3", "3"], ["NumpadEnter", "Ent", 1, 2]]);
  row("numpad", 5.5, 19, [["Numpad0", "0", 2], ["NumpadDecimal", "."]]);

  // Laptop layout: no nav cluster or numpad, the right-hand modifiers shrink and
  // the arrow keys tuck in under the right Shift. null drops the key.
  const COMPACT_PLACEMENT = {
    ShiftRight: { w: 1.75 },
    Space: { w: 5.25 },
    AltRight: { x: 9, w: 1.75 },
    ControlRight: { x: 10.75, w: 1.75 },
    MetaRight: null,
    ContextMenu: null,
    ArrowUp: { x: 14, y: 4.5 },
    ArrowLeft: { x: 13, y: 5.5 },
    ArrowDown: { x: 14, y: 5.5 },
    ArrowRight: { x: 15, y: 5.5 },
  };

  const LAYOUTS = {
    full: { blocks: ["main", "nav", "numpad"], width: 23 },
    tkl: { blocks: ["main", "nav"], width: 18.5 },
    compact: { width: 16 },
  };

  const board = document.getElementById("kb-board");
  const layoutSelect = document.getElementById("kb-layout");
  const els = {
    count: document.getElementById("kb-count"),
    held: document.getElementById("kb-held"),
    max: document.getElementById("kb-max"),
    chatter: document.getElementById("kb-chatter"),
    chatterStat: document.getElementById("kb-chatter-stat"),
    last: document.getElementById("kb-last"),
    lastDetail: document.getElementById("kb-last-detail"),
    locks: document.getElementById("kb-locks"),
    extras: document.getElementById("kb-extras"),
    log: document.getElementById("kb-log"),
  };

  let keyEls = new Map();
  let tested = new Set();
  let held = new Map();
  let lastUp = new Map();
  let extras = new Set();
  let maxHeld = 0;
  let chatterCount = 0;

  function compactPlacement(key) {
    const moved = COMPACT_PLACEMENT[key.code];
    if (moved === null) return null;
    if (moved) return { ...key, ...moved };
    return key.block === "main" ? key : null;
  }

  function visibleKeys(layout) {
    if (layout === "compact") return keys.map(compactPlacement).filter(Boolean);
    const blocks = LAYOUTS[layout].blocks;
    return keys.filter((k) => blocks.includes(k.block));
  }

  function sizeBoard() {
    const units = LAYOUTS[layoutSelect.value].width;
    const box = board.parentElement;
    const pad = getComputedStyle(box);
    const available = box.clientWidth - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight);
    const u = Math.min(56, available / units);
    board.style.setProperty("--u", u + "px");
    board.style.width = u * units + "px";
    board.style.height = u * 6.5 + "px";
  }

  function render() {
    board.textContent = "";
    keyEls = new Map();
    const gap = 0.06;
    for (const key of visibleKeys(layoutSelect.value)) {
      const el = document.createElement("div");
      el.className = "kb-key";
      el.textContent = key.label;
      el.title = key.code;
      el.style.left = `calc(var(--u) * ${key.x + gap / 2})`;
      el.style.top = `calc(var(--u) * ${key.y + gap / 2})`;
      el.style.width = `calc(var(--u) * ${key.w - gap})`;
      el.style.height = `calc(var(--u) * ${key.h - gap})`;
      board.appendChild(el);
      keyEls.set(key.code, el);
    }
    sizeBoard();
    refresh();
  }

  function refresh() {
    for (const [code, el] of keyEls) {
      el.classList.toggle("is-tested", tested.has(code));
      el.classList.toggle("is-down", held.has(code));
    }
    let done = 0;
    for (const code of keyEls.keys()) if (tested.has(code)) done += 1;
    els.count.textContent = `${done} / ${keyEls.size}`;
    els.held.textContent = String(held.size);
    els.max.textContent = String(maxHeld);
    els.chatter.textContent = String(chatterCount);
    els.chatterStat.classList.toggle("tool-stat--warn", chatterCount > 0);

    els.extras.textContent = "";
    for (const code of extras) {
      if (keyEls.has(code)) continue;
      const pill = document.createElement("span");
      pill.className = "tool-pill tool-pill--ok";
      pill.textContent = code;
      els.extras.appendChild(pill);
    }
    if (!els.extras.childElementCount) {
      const none = document.createElement("span");
      none.className = "tool-note";
      none.style.margin = "0";
      none.textContent = "None yet";
      els.extras.appendChild(none);
    }
  }

  function log(text, warn) {
    const li = document.createElement("li");
    const t = new Date().toLocaleTimeString();
    li.textContent = `${t}  ${text}`;
    if (warn) li.className = "is-warn";
    els.log.prepend(li);
    while (els.log.childElementCount > LOG_LIMIT) els.log.lastElementChild.remove();
  }

  function updateLocks(e) {
    const states = ["CapsLock", "NumLock", "ScrollLock"].map((k) => {
      const on = e.getModifierState && e.getModifierState(k);
      const el = keyEls.get(k);
      if (el) el.classList.toggle("is-lock", Boolean(on));
      return `${k.replace("Lock", "")} ${on ? "on" : "off"}`;
    });
    els.locks.textContent = states.join(" · ");
  }

  function keyName(e) {
    if (e.key === " ") return "Space";
    return e.key && e.key.length <= 12 ? e.key : e.code;
  }

  function onKeyDown(e) {
    if (e.target.closest && e.target.closest("input, select, textarea")) return;
    e.preventDefault();
    const code = e.code || `key-${e.keyCode}`;
    updateLocks(e);
    if (e.repeat) return;

    const now = performance.now();
    const sinceUp = now - (lastUp.get(code) ?? -Infinity);
    if (sinceUp < CHATTER_MS) {
      chatterCount += 1;
      const el = keyEls.get(code);
      if (el) el.classList.add("is-chatter");
      log(`CHATTER  ${code} pressed again ${Math.round(sinceUp)} ms after release`, true);
    }

    held.set(code, now);
    maxHeld = Math.max(maxHeld, held.size);
    tested.add(code);
    if (!keyEls.has(code)) extras.add(code);

    els.last.textContent = keyName(e);
    els.lastDetail.textContent = `code ${code} · keyCode ${e.keyCode}${e.location ? ` · location ${e.location}` : ""}`;
    log(`down  ${code}  (${keyName(e)})`);
    refresh();
  }

  function onKeyUp(e) {
    if (e.target.closest && e.target.closest("input, select, textarea")) return;
    e.preventDefault();
    const code = e.code || `key-${e.keyCode}`;
    const downAt = held.get(code);
    held.delete(code);
    lastUp.set(code, performance.now());
    updateLocks(e);

    // Print Screen (and some vendor keys) only ever send keyup.
    if (!tested.has(code)) {
      tested.add(code);
      if (!keyEls.has(code)) extras.add(code);
      els.last.textContent = keyName(e);
      els.lastDetail.textContent = `code ${code} · keyup only`;
    }
    log(`up    ${code}${downAt ? `  held ${Math.round(performance.now() - downAt)} ms` : ""}`);
    refresh();
  }

  function reset() {
    tested = new Set();
    held = new Map();
    lastUp = new Map();
    extras = new Set();
    maxHeld = 0;
    chatterCount = 0;
    els.last.textContent = "–";
    els.lastDetail.textContent = "Press any key";
    els.log.textContent = "";
    for (const el of keyEls.values()) el.classList.remove("is-chatter");
    refresh();
  }

  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", () => {
    // Releasing keys while another window has focus never fires keyup here.
    held = new Map();
    refresh();
  });
  window.addEventListener("resize", sizeBoard);
  layoutSelect.addEventListener("change", () => {
    layoutSelect.blur();
    render();
  });
  document.getElementById("kb-reset").addEventListener("click", (e) => {
    e.currentTarget.blur();
    reset();
  });

  // Full screen plus the Keyboard Lock API lets Chrome/Edge pass Esc, Win and
  // other system shortcuts to the page instead of acting on them.
  document.getElementById("kb-fullscreen").addEventListener("click", async (e) => {
    e.currentTarget.blur();
    try {
      await document.documentElement.requestFullscreen();
      if (navigator.keyboard && navigator.keyboard.lock) await navigator.keyboard.lock();
      log("Full screen on. Hold Esc for 2 seconds to leave.");
    } catch (err) {
      log(`Full screen not available: ${err.message}`, true);
    }
  });

  // ---------- Mouse ----------
  const pad = document.getElementById("mouse-pad");
  const mouseCounts = {};
  const mouseStat = (id) => document.querySelector(`[data-mouse="${id}"]`);

  function bump(id) {
    mouseCounts[id] = (mouseCounts[id] || 0) + 1;
    const el = mouseStat(id);
    if (el) el.querySelector("strong").textContent = String(mouseCounts[id]);
  }

  pad.addEventListener("mousedown", (e) => {
    e.preventDefault();
    bump(e.button);
    const el = mouseStat(e.button);
    if (el) el.classList.add("is-down");
    log(`mouse down  button ${e.button}`);
  });
  window.addEventListener("mouseup", (e) => {
    const el = mouseStat(e.button);
    if (el) el.classList.remove("is-down");
    // Stops the side buttons from navigating back/forward while testing.
    if (pad.contains(e.target) && e.button > 2) e.preventDefault();
  });
  pad.addEventListener("auxclick", (e) => e.preventDefault());
  pad.addEventListener("contextmenu", (e) => e.preventDefault());
  pad.addEventListener("dblclick", () => {
    bump("dbl");
    log("mouse double click");
  });
  pad.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (e.deltaY < 0) bump("up");
      else if (e.deltaY > 0) bump("down");
    },
    { passive: false }
  );

  render();
})();
