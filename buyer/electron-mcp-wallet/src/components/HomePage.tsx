import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.svg";
import { useGlobalContext } from "../contexts/GlobalContext.js";

export default function HomePage() {
  const navigate = useNavigate();
  const { setPrivateKey, setPort } = useGlobalContext();
  const [isStarting, setIsStarting] = useState(false);
  const [serverStatus, setServerStatus] = useState<string>("");

  const handleStartServer = async () => {
    try {
      setIsStarting(true);
      setServerStatus("Authenticating...");

      const privateKey = await window.electronAPI.getPrivateKey();
      console.log("privateKey", privateKey);

      if (!privateKey) {
        setServerStatus("Wallet not found. Please create a new wallet.");
        setIsStarting(false);
        return;
      }

      // Save private key to context
      setPrivateKey(privateKey);

      const { port } = await window.electronAPI.startServer(privateKey);
      setPort(port);
      navigate("/server-running");

      // // Check if Touch ID is available and prompt for authentication
      // const canPrompt = await window.electronAPI.canPromptTouchID();
      // if (canPrompt) {
      //   try {
      //     await window.electronAPI.promptTouchID("Authenticate to start the wallet");
      //   } catch (error) {
      //     // User cancelled or authentication failed
      //     const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      //     setServerStatus(`Error: ${errorMessage}`);
      //     setIsStarting(false);
      //     setTimeout(() => {
      //       setServerStatus("");
      //     }, 5000);
      //     return;
      //   }
      // }
    } catch (error) {
      // Show error to user
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start server";
      console.error("Failed to start server:", error);
      setServerStatus(`Error: ${errorMessage}`);
      setIsStarting(false);

      // Clear error message after 5 seconds
      setTimeout(() => {
        setServerStatus("");
      }, 5000);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-custom-orange flex flex-col px-6">
      {/* Settings Icon */}
      <div className="flex justify-end pt-6">
        <button
          onClick={() => navigate("/settings")}
          className="hover:opacity-80 transition-opacity cursor-pointer p-2"
          aria-label="Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6 text-primary"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center pt-10">
        <div className="w-full max-w-md space-y-8">
          {/* Logo Section */}
          <div className="flex justify-center">
            <img src={logo} alt="Logo" className="h-32 w-32 object-contain" />
          </div>

          {/* Content Section */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-primary">x402 Wallet</h1>
            <p className="text-primary/80 text-sm">
              Give your agent access paid APIs and MCP tools without any
              subscription fees.
            </p>
          </div>

          {/* Main CTA Button */}
          <div className="flex flex-col gap-2">
            {/* Status Message */}
            {serverStatus && (
              <div
                id="server-status"
                className={`text-center text-sm font-medium py-2 px-4 ${
                  serverStatus.includes("Error")
                    ? "text-red-600 bg-red-50"
                    : "text-primary bg-primary/10"
                }`}
              >
                {serverStatus}
              </div>
            )}
            <button
              id="start-server-btn"
              onClick={handleStartServer}
              disabled={isStarting}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? (
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
                  Starting Wallet...
                </span>
              ) : (
                "Start Wallet"
              )}
            </button>

            <button
              onClick={() => navigate("/create-wallet")}
              className="font-light text-sm hover:text-primary/80 cursor-pointer"
            >
              Create New Wallet
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-primary/80 pb-2">
        Always keep your wallet running to enable your AI agent to pay on
        demand.
      </div>
    </div>
  );
}
