import dotenv from "dotenv";
import type { Network } from "x402-express";

dotenv.config();

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
  x402Version: number;
  solanaNetwork: (typeof AvailableNetworks)[number];
}

const port = parseInt(process.env.PORT as string) || 3001;
const sellerAddress = process.env.SELLER_ADDRESS as `0x${string}`;
const solanaSellerAddress = process.env.SOLANA_SELLER_ADDRESS as `0x${string}`;
const network =
  AvailableNetworks.find(
    (n) => n.network === (process.env.NETWORK as Network)
  ) ?? BaseSepoliaConfig;
const solanaNetwork =
  AvailableNetworks.find(
    (n) => n.network === (process.env.SOLANA_NETWORK as Network)
  ) ?? SolanaDevnetConfig;
const x402Version = parseInt(process.env.X402_VERSION as string) || 1;

export const config: Config = {
  port,
  sellerAddress,
  network,
  solanaSellerAddress,
  solanaNetwork,
  x402Version,
};
