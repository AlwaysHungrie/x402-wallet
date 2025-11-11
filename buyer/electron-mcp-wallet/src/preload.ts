// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  startServer: (privateKey: string) =>
    ipcRenderer.invoke("start-server", privateKey),
  stopServer: () => ipcRenderer.invoke("stop-server"),
  getServerStatus: () => ipcRenderer.invoke("get-server-status"),
  navigateToPage: (page: string) =>
    ipcRenderer.invoke("navigate-to-page", page),
  getPrivateKey: () =>
    ipcRenderer.invoke("get-private-key") as Promise<string | null>,
  canPromptTouchID: () => ipcRenderer.invoke("can-prompt-touch-id"),
  promptTouchID: (reason: string) =>
    ipcRenderer.invoke("prompt-touch-id", reason),
  saveWalletPrivateKey: (privateKey: string) =>
    ipcRenderer.invoke("save-private-key", privateKey),
  getWalletAddress: (privateKey: string) =>
    ipcRenderer.invoke("get-wallet-address", privateKey) as Promise<string>,
  deriveSolanaWallet: (mnemonic: string) =>
    ipcRenderer.invoke("derive-solana-wallet", mnemonic) as Promise<{
      address: string;
      privateKey: string;
    }>,
  getBalances: (address: string, network: string) =>
    ipcRenderer.invoke("get-balances", address, network) as Promise<{
      network: string;
      ethBalance: string;
      usdcBalance: string;
    }>,
  getApiConfigs: () =>
    ipcRenderer.invoke("get-api-configs") as Promise<{
      configs: Array<{
        id: string;
        name: string;
        endpoint: string;
        method: "GET";
        queryParamsSchema: string;
        outputSchema: string;
        description: string;
      }>;
    } | null>,
  saveApiConfigs: (configs: {
    configs: Array<{
      id: string;
      name: string;
      endpoint: string;
      method: "GET";
      queryParamsSchema: string;
      outputSchema: string;
      description: string;
    }>;
  }) => ipcRenderer.invoke("save-api-configs", configs) as Promise<void>,
});
