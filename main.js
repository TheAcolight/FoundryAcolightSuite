Hooks.once('init', () => {
  console.log("Android Test Module | Initializing...");
});

Hooks.on('ready', () => {
  ui.notifications.info("Android Module is active and running!");
});