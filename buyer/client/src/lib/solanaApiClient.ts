"use client";

import { createX402Client } from "x402-solana/client";
import { WalletContextState } from "@solana/wallet-adapter-react";

class SolanaApiClient {
  private client: ReturnType<typeof createX402Client>;
  private baseUrl: string;

  constructor(wallet: WalletContextState, baseUrl: string) {
    try {
      this.baseUrl = baseUrl;
      // Create x402 client
      const client = createX402Client({
        wallet: {
          address: wallet.publicKey?.toString() ?? "",
          signTransaction: async (tx) => {
            if (!wallet.signTransaction)
              throw new Error("Wallet does not support signing");
            return await wallet.signTransaction(tx);
          },
        },
        network: "solana-devnet",
        maxPaymentAmount: BigInt(10_000_000), // Optional: max 10 USDC
      });
      this.client = client;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async getWeather() {
    try {
      const response = await this.client.fetch(this.baseUrl + "/solana-weather", {
        method: "GET",
      });
      
      // Decode the X-PAYMENT-RESPONSE header
      const paymentResponseHeader = response.headers.get("X-PAYMENT-RESPONSE");
      let paymentResponse = null;
      
      if (paymentResponseHeader) {
        try {
          // Decode from base64 and parse JSON
          const decodedString = atob(paymentResponseHeader);
          paymentResponse = JSON.parse(decodedString);
        } catch (error) {
          console.error("Failed to decode payment response header:", error);
        }
      }

      const result = await response.json();
      return { data: result, paymentResponse };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

export default SolanaApiClient;
