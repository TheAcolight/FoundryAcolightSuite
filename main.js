const MODULE_ID = "AcolightSuite";
const SOCKET_CHANNEL = `module.${MODULE_ID}`;
const BUBBLE_LAYER_ID = "acolight-bubble-layer";
const DEFAULT_BUBBLE_TEXT = "...";
const SEND_THROTTLE_MS = 33;

Hooks.once("init", () => {
  console.log("Android Test Module | Initializing...");

  game.settings.register(MODULE_ID, "hotkey", {
    name: "Speech Bubble Hotkey",
    hint: "KeyboardEvent.code value (e.g. KeyB, ShiftLeft). Hold to show the bubble.",
    scope: "client",
    config: true,
    type: String,
    default: "ShiftLeft",
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
    if (event.code !== game.settings.get(MODULE_ID, "hotkey")) return;

    isActive = true;
    setBubbleActive(localUserId, true, DEFAULT_BUBBLE_TEXT, game.user?.color);
    moveBubble(localUserId, lastMouse.x, lastMouse.y);
    sendState(true, DEFAULT_BUBBLE_TEXT);
  };

  const handleKeyUp = (event) => {
    if (event.code !== game.settings.get(MODULE_ID, "hotkey")) return;
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