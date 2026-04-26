// Electron main process for Track Side Ops desktop wrapper.
// Loads the live web app so updates ship instantly with no rebuild.
const { app, BrowserWindow, Menu, shell, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");

const APP_URL = process.env.TRACKSIDE_URL || "https://tracksideops.com";
const APP_NAME = "Track Side Ops";

app.setName(APP_NAME);

let mainWindow = null;
let welcomeWindow = null;

function welcomeFlagPath() {
  return path.join(app.getPath("userData"), "welcome-shown.flag");
}
function welcomeAlreadyShown() {
  try { return fs.existsSync(welcomeFlagPath()); } catch { return false; }
}
function markWelcomeShown() {
  try {
    fs.mkdirSync(path.dirname(welcomeFlagPath()), { recursive: true });
    fs.writeFileSync(welcomeFlagPath(), new Date().toISOString());
  } catch { /* ignore */ }
}

function showWelcome(parent) {
  if (welcomeWindow) { welcomeWindow.focus(); return; }
  welcomeWindow = new BrowserWindow({
    width: 600,
    height: 640,
    parent: parent || undefined,
    modal: !!parent,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: "Welcome to Track Side Ops",
    backgroundColor: "#0a0a0a",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  welcomeWindow.setMenuBarVisibility(false);
  welcomeWindow.loadFile(path.join(__dirname, "welcome.html"));

  // Intercept the "app://welcome-dismiss?suppress=…" navigation from welcome.html.
  welcomeWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("app://welcome-dismiss")) {
      event.preventDefault();
      try {
        const u = new URL(url);
        if (u.searchParams.get("suppress") === "1") markWelcomeShown();
      } catch { /* ignore */ }
      if (welcomeWindow) welcomeWindow.close();
    }
  });

  welcomeWindow.on("closed", () => { welcomeWindow = null; });
}

function createWindow() {
  const iconPath = path.join(__dirname, "icon.png");
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) icon = undefined;
  } catch {
    icon = undefined;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    title: APP_NAME,
    backgroundColor: "#0a0a0a",
    icon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(APP_URL);

  // Open external links (target=_blank, mailto:, http(s) outside our origin) in the user's default browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      const target = new URL(url);
      const current = new URL(APP_URL);
      if (target.origin !== current.origin) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      /* ignore parse errors */
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Show the first-run welcome modal once the main window is visible.
  mainWindow.webContents.once("did-finish-load", () => {
    if (!welcomeAlreadyShown()) showWelcome(mainWindow);
  });
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [{
          label: APP_NAME,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        }]
      : []),
    {
      label: "File",
      submenu: [isMac ? { role: "close" } : { role: "quit" }],
    },
    { label: "Edit", submenu: [
      { role: "undo" }, { role: "redo" }, { type: "separator" },
      { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
    ]},
    { label: "View", submenu: [
      { role: "reload" }, { role: "forceReload" }, { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
      { type: "separator" }, { role: "togglefullscreen" },
    ]},
    { label: "Window", submenu: [
      { role: "minimize" }, { role: "zoom" },
      ...(isMac ? [{ type: "separator" }, { role: "front" }] : [{ role: "close" }]),
    ]},
    {
      role: "help",
      submenu: [
        {
          label: "Show Welcome…",
          click: () => showWelcome(mainWindow),
        },
        { type: "separator" },
        {
          label: "Visit tracksideops.com",
          click: () => shell.openExternal("https://tracksideops.com"),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Single-instance lock: focus existing window if user launches twice.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    buildMenu();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}