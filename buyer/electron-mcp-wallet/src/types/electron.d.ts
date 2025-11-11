// Type definitions for Electron API exposed via preload script

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
          description: string;
        }>;
      } | null>;
      saveApiConfigs: (configs: {
        configs: Array<{
          id: string;
          endpoint: string;
          method: "GET";
          queryParamsSchema: string;
          description: string;
        }>;
      }) => Promise<void>;
    };
  }
}

export {};

