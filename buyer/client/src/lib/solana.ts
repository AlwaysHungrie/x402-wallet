import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// Solana devnet configuration
export const SOLANA_NETWORK = WalletAdapterNetwork.Devnet;
export const SOLANA_RPC_URL = clusterApiUrl('devnet');

