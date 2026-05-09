const MODULE_ID = "AcolightSuite";
const SOCKET_CHANNEL = `module.${MODULE_ID}`;
const BUBBLE_LAYER_ID = "acolight-bubble-layer";
const DEFAULT_BUBBLE_TEXT = "...";
const SEND_THROTTLE_MS = 33;
const CUSTOM_HOTKEY_VALUE = "Custom";
const HOTKEY_CHOICES = {
  ShiftLeft: "Left Shift",
  ShiftRight: "Right Shift",
  ControlLeft: "Left Ctrl",
  ControlRight: "Right Ctrl",
  AltLeft: "Left Alt",
  AltRight: "Right Alt",
  Space: "Space",
  KeyB: "B",
  KeyC: "C",
  KeyE: "E",
  KeyF: "F",
  KeyG: "G",
  KeyH: "H",
  KeyQ: "Q",
  KeyR: "R",
  KeyT: "T",
  KeyV: "V",
  KeyX: "X",
  KeyY: "Y",
  KeyZ: "Z",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Digit0: "0",
  Custom: "Custom (use field below)",
};

Hooks.once("init", () => {
  console.log("Android Test Module | Initializing...");

  game.settings.register(MODULE_ID, "hotkey", {
    name: "Speech Bubble Hotkey",
    hint: "Choose a key to hold for the bubble. Select Custom to enter a specific KeyboardEvent.code.",
    scope: "client",
    config: true,
    type: String,
    choices: HOTKEY_CHOICES,
    default: "ShiftLeft",
  });

  game.settings.register(MODULE_ID, "customHotkey", {
    name: "Custom Hotkey Code",
    hint: "Used when Hotkey is set to Custom (example: KeyB, ShiftLeft).",
    scope: "client",
    config: true,
    type: String,
    default: "",
  });
});

Hooks.on("ready", () => {
  ui.notifications.info("Android Module is active and running!");

  const bubbles = new Map();
  const localUserId = game.user?.id ?? null;
  const socket = game.socket;
  let isActive = false;
  let lastSent = 0;
  let lastMouse = { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) };

  const ensureLayer = () => {
    let layer = document.getElementById(BUBBLE_LAYER_ID);
    if (!layer) {
      layer = document.createElement("div");
      layer.id = BUBBLE_LAYER_ID;
      document.body.appendChild(layer);
    }
    return layer;
  };

  const ensureBubble = (userId, color) => {
    if (!userId) return null;
    let bubble = bubbles.get(userId);
    if (!bubble) {
      bubble = document.createElement("div");
      bubble.className = "acolight-bubble";
      bubble.dataset.userId = userId;
      bubble.hidden = true;
      ensureLayer().appendChild(bubble);
      bubbles.set(userId, bubble);
    }
    if (color) {
      bubble.style.setProperty("--acolight-bubble-color", color);
    }
    return bubble;
  };

  const setBubbleActive = (userId, active, text, color) => {
    const bubble = ensureBubble(userId, color);
    if (!bubble) return;
    bubble.hidden = !active;
    if (active) {
      bubble.textContent = text || DEFAULT_BUBBLE_TEXT;
    }
  };

  const moveBubble = (userId, x, y) => {
    if (x == null || y == null) return;
    const bubble = ensureBubble(userId);
    if (!bubble) return;
    const offsetX = 16;
    const offsetY = -24;
    bubble.style.transform = `translate(${Math.round(x + offsetX)}px, ${Math.round(y + offsetY)}px)`;
  };

  const isEditableTarget = (target) => {
    if (!target) return false;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable === true;
  };

  const getHotkeyCode = () => {
    const selected = game.settings.get(MODULE_ID, "hotkey");
    if (selected === CUSTOM_HOTKEY_VALUE) {
      return game.settings.get(MODULE_ID, "customHotkey") || "ShiftLeft";
    }
    return selected || "ShiftLeft";
  };

  const sendState = (active, text) => {
    if (!localUserId) return;
    socket.emit(SOCKET_CHANNEL, {
      type: "state",
      userId: localUserId,
      active,
      text,
      color: game.user?.color ?? null,
    });
  };

  const sendMove = (x, y, text) => {
    if (!localUserId) return;
    socket.emit(SOCKET_CHANNEL, {
      type: "move",
      userId: localUserId,
      x,
      y,
      text,
      color: game.user?.color ?? null,
    });
  };

  const handleKeyDown = (event) => {
    if (event.repeat) return;
    if (isEditableTarget(event.target)) return;
    if (event.code !== getHotkeyCode()) return;

    isActive = true;
    setBubbleActive(localUserId, true, DEFAULT_BUBBLE_TEXT, game.user?.color);
    moveBubble(localUserId, lastMouse.x, lastMouse.y);
    sendState(true, DEFAULT_BUBBLE_TEXT);
    sendMove(lastMouse.x, lastMouse.y, DEFAULT_BUBBLE_TEXT);
  };

  const handleKeyUp = (event) => {
    if (event.code !== getHotkeyCode()) return;
    if (!isActive) return;

    isActive = false;
    setBubbleActive(localUserId, false);
    sendState(false, DEFAULT_BUBBLE_TEXT);
  };

  const handleMouseMove = (event) => {
    lastMouse = { x: event.clientX, y: event.clientY };
    if (!isActive) return;

    moveBubble(localUserId, lastMouse.x, lastMouse.y);

    const now = Date.now();
    if (now - lastSent >= SEND_THROTTLE_MS) {
      lastSent = now;
      sendMove(lastMouse.x, lastMouse.y, DEFAULT_BUBBLE_TEXT);
    }
  };

  const handleBlur = () => {
    if (!isActive) return;
    isActive = false;
    setBubbleActive(localUserId, false);
    sendState(false, DEFAULT_BUBBLE_TEXT);
  };

  socket.on(SOCKET_CHANNEL, (payload) => {
    if (!payload || payload.userId === localUserId) return;

    if (payload.type === "state") {
      setBubbleActive(payload.userId, payload.active, payload.text, payload.color);
      return;
    }

    if (payload.type === "move") {
      setBubbleActive(payload.userId, true, payload.text, payload.color);
      moveBubble(payload.userId, payload.x, payload.y);
    }
  });

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("blur", handleBlur);
});