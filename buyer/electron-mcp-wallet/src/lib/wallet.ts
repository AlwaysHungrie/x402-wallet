import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";
import log from "electron-log";

// File path for storing private key
const getStoragePath = (): string => {
  return path.join(app.getPath("userData"), "wallet-key.txt");
};

export async function getWalletPrivateKey(): Promise<string | null> {
  try {
    const storagePath = getStoragePath();

    // Check if the storage file exists
    try {
      await fs.access(storagePath);
    } catch {
      // File doesn't exist, return null
      return null;
    }

    // Read the private key from file
    const privateKey = await fs.readFile(storagePath, "utf-8");
    
    console.log("Successfully retrieved private key");
    return privateKey.trim();
  } catch (error) {
    log.error("Error retrieving private key:", error);
    console.error("Error retrieving private key:", error);
    throw error;
  }
}

export async function saveWalletPrivateKey(privateKey: string): Promise<void> {
  try {
    const storagePath = getStoragePath();
    
    // Ensure the userData directory exists
    const userDataDir = app.getPath("userData");
    await fs.mkdir(userDataDir, { recursive: true });
    
    // Write the private key to file as plain text
    await fs.writeFile(storagePath, privateKey, "utf-8");
    
    console.log("Successfully saved private key");
  } catch (error) {
    log.error("Error saving private key:", error);
    console.error("Error saving private key:", error);
    throw error;
  }
}

export async function getWalletAddress(privateKey: string): Promise<string> {
  // Parse the stored private key (JSON array of secret key bytes)
  const secretKeyArray = JSON.parse(privateKey);
  
  // Import Solana Keypair
  const { Keypair } = await import("@solana/web3.js");
  
  // Create keypair from secret key array
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
  
  // Return the Solana address (public key as base58 string)
  return keypair.publicKey.toBase58();
}

export async function deriveSolanaWalletFromMnemonic(mnemonic: string): Promise<{
  address: string;
  privateKey: string;
}> {
  // Import required modules (available in main process)
  const { mnemonicToSeed } = await import("@scure/bip39");
  const { derivePath } = await import("ed25519-hd-key");
  const { Keypair } = await import("@solana/web3.js");
  const Buffer = (await import("buffer")).Buffer;
  
  // Convert mnemonic to seed
  const seed = await mnemonicToSeed(mnemonic, undefined);
  
  // Convert seed to hex string
  const hexSeed = Buffer.from(seed).toString("hex");
  
  // Derive key using Solana BIP44 path: m/44'/501'/0'/0'
  // This matches Phantom wallet's derivation path
  const derivedSeed = derivePath("m/44'/501'/0'/0'", hexSeed);
  
  // Convert derived key to Uint8Array
  const solanaSeed = new Uint8Array(derivedSeed.key);
  
  // Create Solana keypair from seed
  const keypair = Keypair.fromSeed(solanaSeed);
  
  // Get the Solana address (public key as base58 string)
  const address = keypair.publicKey.toBase58();
  
  // Store the private key as JSON array of secret key bytes
  const privateKeyArray = Array.from(keypair.secretKey);
  const privateKey = JSON.stringify(privateKeyArray);
  
  return { address, privateKey };
}

