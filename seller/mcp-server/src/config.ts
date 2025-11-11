import type { Network } from "x402/types";
import { createPaidMcpHandler } from "x402-mcp";

try {
  if (process.env.NODE_ENV !== "production") {
    const dotenv = await import("dotenv");
    dotenv.config();
  }
} catch (error) {
  // ignore error
  // env will be loaded from claude config
}

interface NetworkConfig {
  network: Network;
  url: `${string}://${string}`;
}

const BaseSepoliaConfig: NetworkConfig = {
  network: "base-sepolia",
  url: "https://x402.org/facilitator",
};

const SolanaDevnetConfig: NetworkConfig = {
  network: "solana-devnet",
  url: "https://facilitator.payai.network",
};

export const AvailableNetworks: NetworkConfig[] = [
  BaseSepoliaConfig,
  SolanaDevnetConfig,
];

interface Config {
  port: number;
  sellerAddress: `0x${string}`;
  network: (typeof AvailableNetworks)[number];
  solanaSellerAddress: `0x${string}`;
  solanaNetwork: (typeof AvailableNetworks)[number];
  x402Version: number;
}

const port = parseInt(process.env.PORT as string) || 3001;
const sellerAddress = process.env.SELLER_ADDRESS as `0x${string}`;
const network =
  AvailableNetworks.find(
    (n) => n.network === (process.env.NETWORK as Network)
  ) ?? BaseSepoliaConfig;
const x402Version = parseInt(process.env.X402_VERSION as string) || 1;

const solanaSellerAddress = process.env.SOLANA_SELLER_ADDRESS as `0x${string}`;
const solanaNetwork =
  AvailableNetworks.find(
    (n) => n.network === (process.env.SOLANA_NETWORK as Network)
  ) ?? SolanaDevnetConfig;

export const config: Config = {
  port,
  sellerAddress,
  network,
  x402Version,
  solanaSellerAddress,
  solanaNetwork,
};
