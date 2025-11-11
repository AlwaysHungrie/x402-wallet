import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ensure TypeScript recognizes the electronAPI with Touch ID methods
declare global {
  interface Window {
    electronAPI: {
      startServer: (privateKey: string) => Promise<{ port: number }>;
      stopServer: () => Promise<void>;
      getServerStatus: () => Promise<boolean>;
      getPrivateKey: () => Promise<string | null>;
      canPromptTouchID: () => Promise<boolean>;
      promptTouchID: (reason: string) => Promise<boolean>;
      saveWalletPrivateKey: (privateKey: string) => Promise<void>;
      getWalletAddress: (privateKey: string) => Promise<string>;
      deriveSolanaWallet: (mnemonic: string) => Promise<{
        address: string;
        privateKey: string;
      }>;
      getBalances: (address: string, network: string) => Promise<{
        network: string;
        ethBalance: string;
        usdcBalance: string;
      }>;
      getApiConfigs: () => Promise<{
        configs: Array<{
          id: string;
          endpoint: string;
          method: "GET";
          queryParamsSchema: string;
        }>;
      } | null>;
      saveApiConfigs: (configs: {
        configs: Array<{
          id: string;
          endpoint: string;
          method: "GET";
          queryParamsSchema: string;
        }>;
      }) => Promise<void>;
    };
  }
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
