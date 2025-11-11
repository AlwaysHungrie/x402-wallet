"use client";
import ApiClient from "@/lib/apiClient";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import SolanaApiClient from "@/lib/solanaApiClient";
import { useAccount, useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { Signer } from "x402-axios";

export default function Home() {
  const [solanaApiClient, setSolanaApiClient] =
    useState<SolanaApiClient | null>(null);
  const [apiClient, setApiClient] = useState<ApiClient | null>(null);
  const [data, setData] = useState<any>(null);
  const [paymentResponse, setPaymentResponse] = useState<any>(null);

  const { publicKey, connected } = useWallet();
  const solanaWallet = useWallet();

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Initialize API client with wallet signer when connected
  useEffect(() => {
    (async () => {
      if (connected && solanaWallet) {
        // Use the Solana signer with x402 API client
        try {
          const solanaApiClient = new SolanaApiClient(
            solanaWallet,
            "http://localhost:3001"
          );
          setSolanaApiClient(solanaApiClient);
        } catch (error) {
          console.error("Failed to create API client from wallet:", error);
          setSolanaApiClient(null);
        }
      } else if (!connected) {
        setSolanaApiClient(null);
      }
    })();
  }, [connected, solanaWallet]);

  // Initialize API client with wallet client when connected
  useEffect(() => {
    console.log("useEffect", isConnected, walletClient);
    if (isConnected && walletClient) {
      // Use the wallet client directly as a Signer
      // The walletClient from wagmi is compatible with x402's Signer type at runtime
      try {
        setApiClient(new ApiClient(walletClient as unknown as Signer));
      } catch (error) {
        console.error("Failed to create API client from wallet:", error);
        setApiClient(null);
      }
    } else if (!isConnected) {
      setApiClient(null);
    }
  }, [isConnected, walletClient]);

  const handleGetWeather = useCallback(async () => {
    console.log("handleGetWeather", solanaApiClient);
    if (apiClient) {
      const { data, paymentResponse } = await apiClient.getWeather();
      console.log(data, paymentResponse);
      setData(data);
      setPaymentResponse(paymentResponse);
    }
  }, [apiClient]);

  const handleGetSolanaWeather = useCallback(async () => {
    console.log("handleGetWeather", solanaApiClient);
    if (solanaApiClient) {
      const { data, paymentResponse } = await solanaApiClient.getWeather();
      console.log(data, paymentResponse);
      setData(data);
      setPaymentResponse(paymentResponse);
    }
  }, [solanaApiClient]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-4">
      <div className="flex flex-col items-center gap-4 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">x402 Buyer Client</h1>

        {/* Solana Wallet Connection Section */}
        <div className="w-full border border-gray-300 rounded-md p-4">
          <h2 className="text-lg font-semibold mb-2"></h2>
          <div className="flex justify-center">
            <WalletMultiButton />
          </div>
          {connected && publicKey && (
            <p className="text-sm text-gray-600 mt-2 text-center">
              Connected:{" "}
              <span className="font-mono text-xs">{publicKey.toBase58()}</span>
            </p>
          )}
        </div>

        {/* Ethereum Wallet Connection Section */}
        <div className="w-full border border-gray-300 rounded-md p-4">
          <h2 className="text-lg font-semibold mb-2">Wallet Connection</h2>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
          {isConnected && address && (
            <p className="text-sm text-gray-600 mt-2 text-center">
              Connected: <span className="font-mono text-xs">{address}</span>
            </p>
          )}
        </div>

        {/* API Call Section */}
        <div className="w-full border border-gray-300 rounded-md p-4">
          <button
            onClick={handleGetWeather}
            disabled={!apiClient}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-md p-2 w-full"
          >
            Get Weather
          </button>
          <button
            onClick={handleGetSolanaWeather}
            disabled={!solanaApiClient}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-md p-2 w-full"
          >
            Get Solana Weather
          </button>
          {!solanaApiClient && !apiClient && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Connect a wallet or enter a private key to continue
            </p>
          )}
        </div>

        {/* Results Section */}
        {data && (
          <div className="w-full border border-gray-300 rounded-md p-4">
            <h2 className="text-lg font-semibold mb-2">Data</h2>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}

        {paymentResponse && (
          <div className="w-full border border-gray-300 rounded-md p-4">
            <h2 className="text-lg font-semibold mb-2">Payment Response</h2>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(paymentResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
