const MODULE_ID = "AcolightSuite";
const SOCKET_CHANNEL = `module.${MODULE_ID}`;
const DEFAULT_BUBBLE_TEXT = "...";
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
  console.log("AcolightSuite | Initializing...");

  game.socket.on(SOCKET_CHANNEL, (payload) => {
    if (payload.type === "panToToken" && game.settings.get(MODULE_ID, "panToBubble")) {
      const token = canvas.tokens?.get(payload.tokenId);
      if (token && token.center) {
        canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
      }
    }
  });

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

  game.settings.register(MODULE_ID, "panToBubble", {
    name: "Pan Screen to Chat Bubbles",
    hint: "If enabled, your screen will automatically pan to tokens that start typing a chat bubble using this module.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });
});

Hooks.on("ready", () => {
  console.log("AcolightSuite | Ready.");

  let isActive = false;

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

  const getToken = () => {
    return canvas.tokens?.controlled[0] || game.user?.character?.getActiveTokens()[0];
  };

  const handleKeyDown = (event) => {
    if (event.repeat) return;
    if (isEditableTarget(event.target)) return;
    if (event.code !== getHotkeyCode()) return;

    if (!isActive) {
      isActive = true;
      const token = getToken();
      if (token && canvas.hud?.bubbles) {
        // Broadcast the typing bubble to all clients
        canvas.hud.bubbles.broadcast(token, DEFAULT_BUBBLE_TEXT, { emote: false });
        game.socket.emit(SOCKET_CHANNEL, { type: "panToToken", tokenId: token.id });
      }
    }
  };

  const handleKeyUp = (event) => {
    if (event.code !== getHotkeyCode()) return;
    if (isActive) {
      isActive = false;
    }
  };

  const handleBlur = () => {
    if (isActive) {
      isActive = false;
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", handleBlur);
});
