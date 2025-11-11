import type { Network } from "x402/types";

export interface NetworkConfig {
  network: Network;
  rpcUrl: string;
}

const BaseSepoliaConfig: NetworkConfig = {
  network: "base-sepolia",
  rpcUrl: "https://sepolia.base.org",
};

const SolanaDevnetConfig: NetworkConfig = {
  network: "solana-devnet",
  rpcUrl: "https://api.devnet.solana.com",
};

export const AvailableNetworks: NetworkConfig[] = [SolanaDevnetConfig];

