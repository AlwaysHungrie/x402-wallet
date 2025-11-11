import { createPublicClient, http, formatEther, formatUnits, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import type { Network, Price } from "x402/types";
import { processPriceToAtomicAmount } from "x402/shared";
import { AvailableNetworks, type NetworkConfig } from "./config.js";
import log from "electron-log";
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import axios from "axios";

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
] as const;

// Map network names to viem chains
const networkToChain: Record<string, any> = {
  "base-sepolia": baseSepolia,
};

/**
 * Get the viem chain configuration for a network
 */
function getChainForNetwork(network: Network) {
  const chain = networkToChain[network];
  if (!chain) {
    throw new Error(`Unsupported network: ${network}`);
  }
  return chain;
}

/**
 * Get the RPC URL for a network
 */
function getRpcUrlForNetwork(network: Network): string {
  const config = AvailableNetworks.find((n) => n.network === network);
  if (!config) {
    throw new Error(`Network config not found for: ${network}`);
  }
  return config.rpcUrl;
}

/**
 * Get ETH balance for a wallet address on a specific network
 */
export async function getEthBalance(
  address: string,
  network: Network
): Promise<string> {
  try {
    // Check if this is a Solana network - ETH balance is not applicable
    if (network === "solana-devnet" || network.startsWith("solana-")) {
      throw new Error(`ETH balance is not applicable for Solana network: ${network}`);
    }
    
    const chain = getChainForNetwork(network);
    const rpcUrl = getRpcUrlForNetwork(network);

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const balance = await publicClient.getBalance({
      address: address as Address,
    });

    return formatEther(balance);
  } catch (error) {
    log.error(`Error fetching ETH balance for ${network}:`, error);
    throw error;
  }
}

/**
 * Get USDC address for a network using processPriceToAtomicAmount
 */
function getUsdcAddressForNetwork(network: Network): string {
  try {
    // Check if this is a Solana network - USDC address lookup is not applicable
    if (network === "solana-devnet" || network.startsWith("solana-")) {
      throw new Error(`USDC address lookup is not applicable for Solana network: ${network}`);
    }
    
    // Use a dummy price to get the USDC address
    // The price doesn't matter, we just need the asset address
    // Price format is "$1" based on examples in the codebase
    const price: Price = "$1" as Price;
    const result = processPriceToAtomicAmount(price, network);

    if ("error" in result) {
      throw new Error(result.error);
    }

    return result.asset.address;
  } catch (error) {
    log.error(`Error getting USDC address for ${network}:`, error);
    throw error;
  }
}

/**
 * Get USDC balance for a wallet address on a specific network
 */
export async function getUsdcBalance(
  address: string,
  network: Network
): Promise<string> {
  try {
    // Check if this is a Solana network - USDC balance is not applicable
    if (network === "solana-devnet" || network.startsWith("solana-")) {
      throw new Error(`USDC balance is not applicable for Solana network: ${network}`);
    }
    
    const chain = getChainForNetwork(network);
    const rpcUrl = getRpcUrlForNetwork(network);
    const usdcAddress = getUsdcAddressForNetwork(network);

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    // Get balance and decimals in parallel
    // @ts-expect-error - viem type definitions may have version mismatch
    const balance = await publicClient.readContract({
      address: usdcAddress as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address as Address],
    }) as bigint;

    // @ts-expect-error - viem type definitions may have version mismatch
    const decimals = await publicClient.readContract({
      address: usdcAddress as Address,
      abi: ERC20_ABI,
      functionName: "decimals",
    }) as number;

    // Format balance using formatUnits from viem
    return formatUnits(balance, decimals);
  } catch (error) {
    log.error(`Error fetching USDC balance for ${network}:`, error);
    throw error;
  }
}

/**
 * Get SOL balance for a Solana wallet address using direct RPC call
 * This bypasses potential fetch issues in Electron main process
 */
async function getSolBalanceViaRpc(
  address: string,
  rpcUrl: string
): Promise<number> {
  try {
    // Validate the address first
    const publicKey = new PublicKey(address);
    
    // Make direct RPC call using axios (more reliable in Electron)
    // Increased timeout to 30 seconds for slow RPC endpoints
    const response = await axios.post(
      rpcUrl,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [publicKey.toBase58(), { commitment: "confirmed" }],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // Increased to 30 seconds
      }
    );

    if (response.data.error) {
      throw new Error(`RPC error: ${response.data.error.message}`);
    }

    const balance = response.data.result?.value;
    if (typeof balance !== "number") {
      throw new Error("Invalid balance response from RPC");
    }

    return balance;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
        throw new Error(`Failed to connect to Solana RPC at ${rpcUrl}. Please check your internet connection.`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get SOL balance for a Solana wallet address
 */
export async function getSolBalance(
  address: string,
  network: Network
): Promise<string> {
  try {
    // Use clusterApiUrl for devnet if available, otherwise fall back to config
    let rpcUrl: string;
    if (network === "solana-devnet") {
      // Use the official clusterApiUrl which is more reliable
      rpcUrl = clusterApiUrl("devnet");
    } else {
      rpcUrl = getRpcUrlForNetwork(network);
    }
    
    log.info(`Fetching SOL balance from RPC: ${rpcUrl} for address: ${address}`);
    
    // Use direct RPC call via axios instead of Connection class
    // This avoids potential fetch issues in Electron main process
    const balance = await getSolBalanceViaRpc(address, rpcUrl);
    
    // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    log.info(`Successfully fetched SOL balance: ${solBalance} SOL`);
    return solBalance.toString();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Error fetching SOL balance for ${network} at address ${address}:`, errorMessage);
    
    // Provide a more helpful error message
    if (errorMessage.includes("fetch failed") || errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("connect")) {
      throw new Error(`Failed to connect to Solana RPC for ${network}. Please check your internet connection and RPC endpoint. Error: ${errorMessage}`);
    }
    
    throw error;
  }
}

/**
 * Get USDC token address for Solana network
 */
function getSolanaUsdcAddress(network: Network): string {
  try {
    // Use a dummy price to get the USDC address
    const price: Price = "$1" as Price;
    const result = processPriceToAtomicAmount(price, network);

    if ("error" in result) {
      throw new Error(result.error);
    }

    return result.asset.address;
  } catch (error) {
    log.error(`Error getting USDC address for ${network}:`, error);
    throw error;
  }
}

/**
 * Get SPL token balance for a Solana wallet address using direct RPC call
 * Uses a more efficient approach with longer timeout
 */
async function getSolanaTokenBalanceViaRpc(
  walletAddress: string,
  tokenMintAddress: string,
  rpcUrl: string
): Promise<{ balance: string; decimals: number }> {
  try {
    const walletPublicKey = new PublicKey(walletAddress);
    const mintPublicKey = new PublicKey(tokenMintAddress);
    
    // Use getTokenAccountsByOwner with jsonParsed encoding for efficiency
    // Increased timeout to 30 seconds for slow RPC endpoints
    const response = await axios.post(
      rpcUrl,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          walletPublicKey.toBase58(),
          {
            mint: mintPublicKey.toBase58(),
          },
          {
            encoding: "jsonParsed",
            commitment: "confirmed",
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // Increased to 30 seconds
      }
    );

    if (response.data.error) {
      throw new Error(`RPC error: ${response.data.error.message}`);
    }

    const tokenAccounts = response.data.result?.value;
    
    // If no token account exists, balance is 0
    if (!tokenAccounts || tokenAccounts.length === 0) {
      return { balance: "0", decimals: 6 }; // USDC typically has 6 decimals
    }

    // Get the first token account's balance from parsed info
    const tokenAccount = tokenAccounts[0];
    const parsedInfo = tokenAccount.account?.data?.parsed?.info;
    
    // Extract balance and decimals from parsed info
    if (parsedInfo?.tokenAmount) {
      const tokenAmount = parsedInfo.tokenAmount;
      return {
        balance: tokenAmount.amount || "0",
        decimals: tokenAmount.decimals || 6,
      };
    }

    // Fallback: if parsed info is not available, try getTokenAccountBalance
    // This should rarely happen with jsonParsed encoding
    const tokenAccountAddress = tokenAccount.pubkey;
    const balanceResponse = await axios.post(
      rpcUrl,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "getTokenAccountBalance",
        params: [tokenAccountAddress, { commitment: "confirmed" }],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // Increased to 30 seconds
      }
    );

    if (balanceResponse.data.error) {
      throw new Error(`RPC error: ${balanceResponse.data.error.message}`);
    }

    const balanceResult = balanceResponse.data.result?.value;
    if (!balanceResult) {
      return { balance: "0", decimals: 6 };
    }

    return {
      balance: balanceResult.amount || "0",
      decimals: balanceResult.decimals || 6,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
        throw new Error(`Failed to connect to Solana RPC at ${rpcUrl} (timeout). The RPC endpoint may be slow or unavailable.`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get USDC balance for a Solana wallet address
 */
export async function getSolanaUsdcBalance(
  address: string,
  network: Network
): Promise<string> {
  try {
    // Get RPC URL
    let rpcUrl: string;
    if (network === "solana-devnet") {
      rpcUrl = clusterApiUrl("devnet");
    } else {
      rpcUrl = getRpcUrlForNetwork(network);
    }
    
    // Get USDC token mint address
    const usdcAddress = getSolanaUsdcAddress(network);
    
    log.info(`Fetching USDC balance from RPC: ${rpcUrl} for address: ${address}, token: ${usdcAddress}`);
    
    // Get token balance
    const { balance, decimals } = await getSolanaTokenBalanceViaRpc(
      address,
      usdcAddress,
      rpcUrl
    );
    
    // Convert to human-readable format
    const balanceNumber = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const wholePart = balanceNumber / divisor;
    const fractionalPart = balanceNumber % divisor;
    
    let usdcBalance: string;
    if (fractionalPart === BigInt(0)) {
      usdcBalance = wholePart.toString();
    } else {
      // Format with proper decimal places
      const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
      // Remove trailing zeros
      const trimmedFractional = fractionalStr.replace(/0+$/, "");
      usdcBalance = trimmedFractional ? `${wholePart}.${trimmedFractional}` : wholePart.toString();
    }
    
    log.info(`Successfully fetched USDC balance: ${usdcBalance} USDC`);
    return usdcBalance;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Error fetching USDC balance for ${network} at address ${address}:`, errorMessage);
    throw error;
  }
}

/**
 * Get balances for a specific network
 */
export interface NetworkBalance {
  network: Network;
  ethBalance: string;
  usdcBalance: string;
  solBalance?: string;
}

export async function getBalances(
  address: string,
  network: Network
): Promise<NetworkBalance> {
  try {
    // Check if this is a Solana network
    const isSolanaNetwork = network === "solana-devnet" || network.startsWith("solana-");
    
    if (isSolanaNetwork) {
      // For Solana networks, fetch SOL and USDC balances
      const [solBalance, usdcBalance] = await Promise.all([
        getSolBalance(address, network),
        getSolanaUsdcBalance(address, network).catch((error) => {
          log.error(`Error fetching USDC balance, returning "0":`, error);
          return "0"; // Return 0 if USDC balance fetch fails
        }),
      ]);
      
      return {
        network,
        ethBalance: "N/A", // Not applicable for Solana
        usdcBalance,
        solBalance,
      };
    } else {
      // For EVM networks, fetch ETH and USDC balances
      const [ethBalance, usdcBalance] = await Promise.all([
        getEthBalance(address, network),
        getUsdcBalance(address, network),
      ]);

      return {
        network,
        ethBalance,
        usdcBalance,
      };
    }
  } catch (error) {
    log.error(`Error fetching balances for ${network}:`, error);
    // Return error state if fetching fails
    const isSolanaNetwork = network === "solana-devnet" || network.startsWith("solana-");
    
    if (isSolanaNetwork) {
      return {
        network,
        ethBalance: "N/A",
        usdcBalance: "Error",
        solBalance: "Error",
      };
    } else {
      return {
        network,
        ethBalance: "Error",
        usdcBalance: "Error",
      };
    }
  }
}

