import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "../contexts/GlobalContext";
import { AvailableNetworks } from "../lib/config";
import type { Network } from "x402/types";

interface NetworkBalance {
  network: string;
  ethBalance: string;
  usdcBalance: string;
  solBalance?: string;
}

export default function ServerRunningPage() {
  const navigate = useNavigate();
  const { privateKey, port } = useGlobalContext();
  const [isStopping, setIsStopping] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<NetworkBalance | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(
    AvailableNetworks[0]?.network || ("solana-devnet" as Network)
  );

  const initWalletAddress = useCallback(async (privateKey: string) => {
    const address = await window.electronAPI.getWalletAddress(privateKey);
    setWalletAddress(address);
  }, []);

  const fetchBalances = useCallback(
    async (address: string, network: Network) => {
      if (!address) return;
      setIsLoadingBalances(true);
      try {
        const networkBalance = await window.electronAPI.getBalances(
          address,
          network
        );
        setBalance(networkBalance);
      } catch (error) {
        console.error("Error fetching balances:", error);
      } finally {
        setIsLoadingBalances(false);
      }
    },
    []
  );

  useEffect(() => {
    if (privateKey) {
      initWalletAddress(privateKey);
    }
  }, [privateKey, initWalletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchBalances(walletAddress, selectedNetwork);
    }
  }, [walletAddress, selectedNetwork, fetchBalances]);

  const handleStopServer = async () => {
    try {
      setIsStopping(true);

      await window.electronAPI.stopServer();
      navigate("/");
    } catch (error) {
      console.error("Failed to stop server:", error);
      setIsStopping(false);
    }
  };

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-custom-orange flex flex-col px-6">
      {/* Close Wallet Button at Top */}
      <div className="pt-6 pb-6">
        <button
          id="stop-server-btn"
          onClick={handleStopServer}
          disabled={isStopping}
          className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
        >
          {isStopping ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Closing Wallet...
            </span>
          ) : (
            "Close Wallet"
          )}
        </button>
      </div>

      {/* Wallet Address Section */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-light text-primary/80">
          Wallet Address:
        </div>
        <p className="text-primary font-mono text-lg font-bold break-all">
          {walletAddress || "Loading..."}&nbsp;
          <span
            onClick={handleCopyAddress}
            className="text-xs font-normal text-primary/80 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {copied ? "Copied" : "Copy"}
          </span>
        </p>
      </div>

      {/* Balances Section */}
      {walletAddress && (
        <div className="space-y-4 mt-6">
          {/* Network Selector - Inline with label */}
          <div className="flex items-center gap-2 ">
            <label className="text-sm font-medium text-primary whitespace-nowrap">
              Current Network:
            </label>
            <select
              value={selectedNetwork}
              onChange={(e) => {
                const newNetwork = e.target.value as Network;
                setSelectedNetwork(newNetwork);
                if (walletAddress) {
                  fetchBalances(walletAddress, newNetwork);
                }
              }}
              className="bg-white/10 border border-white/20 rounded-lg px-2 text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent appearance-none cursor-pointer text-sm"
            >
              {AvailableNetworks.map((networkConfig) => (
                <option
                  key={networkConfig.network}
                  value={networkConfig.network}
                  className="bg-custom-orange text-primary"
                >
                  {networkConfig.network}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (walletAddress) {
                  fetchBalances(walletAddress, selectedNetwork);
                }
              }}
              disabled={isLoadingBalances || !walletAddress}
              className="p-1.5 ml-auto hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh balances"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-5 h-5 text-primary ${isLoadingBalances ? "animate-spin" : ""}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </button>
          </div>

          {/* Balance Display - Two separate cards */}
          {isLoadingBalances ? (
            <div className="text-sm text-primary/80">Loading balances...</div>
          ) : !balance ? (
            <div className="text-sm text-primary/80">
              No balance available for this network
            </div>
          ) : (
            (() => {
              const isSolanaNetwork = selectedNetwork === "solana-devnet" || selectedNetwork.startsWith("solana-");
              
              if (isSolanaNetwork && balance.solBalance !== undefined) {
                // Display SOL and USDC balances for Solana networks
                const solValue =
                  balance.solBalance === "Error"
                    ? null
                    : parseFloat(balance.solBalance);
                const usdcValue =
                  balance.usdcBalance === "Error" || balance.usdcBalance === "N/A"
                    ? null
                    : parseFloat(balance.usdcBalance);

                const formatSol = (value: number | null) => {
                  if (value === null) return "Error";
                  if (value === 0) return "0 SOL";
                  if (value < 0.001) return value.toExponential(2) + " SOL";
                  return value.toFixed(4) + " SOL";
                };

                const formatUsdc = (value: number | null) => {
                  if (value === null) return "Error";
                  if (value === 0) return "$0";
                  return "$" + value.toFixed(2);
                };

                const formattedSol = formatSol(solValue);
                const formattedUsdc = formatUsdc(usdcValue);

                return (
                  <div className="grid grid-cols-2 gap-4">
                    {/* USDC Card */}
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-xs text-primary/80 mb-1">USDC</div>
                      <div className="text-xl font-semibold text-primary">
                        {formattedUsdc}
                      </div>
                    </div>

                    {/* SOL Card */}
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-xs text-primary/80 mb-1">SOL</div>
                      <div className="text-xl font-semibold text-primary">
                        {formattedSol}
                      </div>
                    </div>
                  </div>
                );
              } else {
                // Display ETH and USDC balances for EVM networks
                const ethValue =
                  balance.ethBalance === "Error" || balance.ethBalance === "N/A"
                    ? null
                    : parseFloat(balance.ethBalance);
                const usdcValue =
                  balance.usdcBalance === "Error" || balance.usdcBalance === "N/A"
                    ? null
                    : parseFloat(balance.usdcBalance);

                const formatEth = (value: number | null) => {
                  if (value === null) return "Error";
                  if (value === 0) return "0 ETH";
                  if (value < 0.001) return value.toExponential(2) + " ETH";
                  return value.toFixed(4) + " ETH";
                };

                const formatUsdc = (value: number | null) => {
                  if (value === null) return "Error";
                  if (value === 0) return "$0";
                  return "$" + value.toFixed(2);
                };

                const formattedUsdc = formatUsdc(usdcValue);
                const formattedEth = formatEth(ethValue);

                return (
                  <div className="grid grid-cols-2 gap-4">
                    {/* USDC Card */}
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-xs text-primary/80 mb-1">USDC</div>
                      <div className="text-xl font-semibold text-primary">
                        {formattedUsdc}
                      </div>
                    </div>

                    {/* ETH Card */}
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-xs text-primary/80 mb-1">ETH</div>
                      <div className="text-xl font-semibold text-primary">
                        {formattedEth}
                      </div>
                    </div>
                  </div>
                );
              }
            })()
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="flex-1 flex flex-col items-center justify-end pb-6 mt-6 space-y-2">
        <div className="text-xs text-primary/80 w-full">
          In order to use with Claude Desktop, add the following line to config file:
        </div>
        <div className="w-full max-w-2xl">
          <pre className="text-xs text-primary bg-white/10 border border-white/20 rounded-lg p-2 overflow-x-auto">
            {`"mcp-wallet": { "command": "npx", "args": ["mcp-remote", "http://localhost:${port}/sse"] }`}
          </pre>
        </div>
      </div>
    </div>
  );
}
