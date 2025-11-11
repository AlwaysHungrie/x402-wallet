import { app, BrowserWindow, ipcMain, systemPreferences } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import type { Network } from "x402/types";
import { startServer, stopServer, isServerRunning } from "./mcp/server";
import {
  getWalletAddress,
  getWalletPrivateKey,
  saveWalletPrivateKey,
  deriveSolanaWalletFromMnemonic,
} from "./lib/wallet";
import { getBalances } from "./lib/balances";
import {
  getApiConfigs,
  saveApiConfigs,
  type ApiConfigs,
} from "./lib/apiConfig";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  const height = 600;
  const width = Math.round(600 * 0.618); // portrait mode

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: width,
    minHeight: height,
    maxWidth: width,
    maxHeight: height,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: true,
    },
  });

  // Explicitly set the size to ensure it's honored
  mainWindow.setSize(width, height);

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // In dev mode, load from Vite dev server
    // The HTML file is at src/index.html
    const baseUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL.replace(/\/$/, "");
    mainWindow.loadURL(`${baseUrl}/src/index.html`);
  } else {
    // In production, load the built React app
    // The built HTML is at .vite/renderer/main_window/src/index.html
    mainWindow.loadFile(
      path.join(
        __dirname,
        `../renderer/${MAIN_WINDOW_VITE_NAME}/src/index.html`
      )
    );
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for server control
ipcMain.handle("start-server", async (_, privateKey: string) => {
  try {
    const port = await startServer(privateKey, 3000);
    return { port };
  } catch (error) {
    // Log error for debugging
    console.error("Error starting server:", error);
    throw error;
  }
});

ipcMain.handle("stop-server", async () => {
  try {
    await stopServer();
    return;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle("get-server-status", async () => {
  return isServerRunning();
});

ipcMain.handle("get-private-key", getWalletPrivateKey);
ipcMain.handle("save-private-key", async (_, privateKey: string) => {
  await saveWalletPrivateKey(privateKey);
});
ipcMain.handle("get-wallet-address", async (_, privateKey: string) => {
  return getWalletAddress(privateKey);
});

ipcMain.handle("derive-solana-wallet", async (_, mnemonic: string) => {
  return deriveSolanaWalletFromMnemonic(mnemonic);
});

// Balance handlers
ipcMain.handle("get-balances", async (_, address: string, network: string) => {
  try {
    return await getBalances(address, network as Network);
  } catch (error) {
    console.error("Error fetching balances:", error);
    throw error;
  }
});

// Touch ID handlers (macOS only)
ipcMain.handle("can-prompt-touch-id", async () => {
  if (process.platform !== "darwin") {
    return false;
  }
  try {
    return systemPreferences.canPromptTouchID();
  } catch (error) {
    console.error("Error checking Touch ID availability:", error);
    return false;
  }
});

ipcMain.handle("prompt-touch-id", async (_, reason: string) => {
  if (process.platform !== "darwin") {
    throw new Error("Touch ID is only available on macOS");
  }
  try {
    await systemPreferences.promptTouchID(reason);
    return true;
  } catch (error) {
    console.error("Touch ID authentication failed:", error);
    throw error;
  }
});

// API Config handlers
ipcMain.handle("get-api-configs", async () => {
  try {
    return await getApiConfigs();
  } catch (error) {
    console.error("Error in get-api-configs handler:", error);
    throw error;
  }
});

ipcMain.handle("save-api-configs", async (_, configs: ApiConfigs) => {
  try {
    console.log("Saving API configs:", JSON.stringify(configs, null, 2));
    await saveApiConfigs(configs);
    console.log("API configs saved successfully");
  } catch (error) {
    console.error("Error in save-api-configs handler:", error);
    throw error;
  }
});

// Stop server when app quits
app.on("before-quit", async () => {
  if (isServerRunning()) {
    await stopServer();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
