import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateWalletPage() {
  const navigate = useNavigate();
  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isWarning1Accepted, setIsWarning1Accepted] = useState(false);
  const [isWarning2Accepted, setIsWarning2Accepted] = useState(false);

  // Load bip39 modules on mount
  const [bip39Modules, setBip39Modules] = useState<{
    generateMnemonic: (wordlist: string[], strength?: number) => string;
    validateMnemonic: (mnemonic: string, wordlist: string[]) => boolean;
    mnemonicToSeed: (mnemonic: string, passphrase?: string) => Promise<Uint8Array>;
    wordlist: string[];
  } | null>(null);

  useEffect(() => {
    const loadModules = async () => {
      const [bip39, wordlistModule] = await Promise.all([
        import("@scure/bip39"),
        import("@scure/bip39/wordlists/english.js"),
      ]);
      setBip39Modules({
        generateMnemonic: bip39.generateMnemonic,
        validateMnemonic: bip39.validateMnemonic,
        mnemonicToSeed: bip39.mnemonicToSeed,
        wordlist: wordlistModule.wordlist,
      });
    };
    loadModules();
  }, []);

  const isWarningAccepted = useMemo(() => {
    return isWarning1Accepted && isWarning2Accepted;
  }, [isWarning1Accepted, isWarning2Accepted]);

  const isValid = useMemo(() => {
    if (!bip39Modules) return false;
    return bip39Modules.validateMnemonic(words.join(" "), bip39Modules.wordlist);
  }, [words, bip39Modules]);

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value;
    setWords(newWords);
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Handle backspace on empty input - move to previous box
    if (e.key === "Backspace" && words[index] === "" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      return;
    }
    // Handle arrow keys
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      return;
    }
    if (e.key === "ArrowRight" && index < 11) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      return;
    }
    // Handle Enter or Space - move to next box if current has content
    if ((e.key === "Enter" || e.key === " ") && words[index] && index < 11) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      return;
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").trim();
    const pastedWords = pastedText
      .split(/\s+/)
      .filter((word) => word.length > 0);

    if (pastedWords.length > 0) {
      const newWords = [...words];
      // Fill starting from current index
      pastedWords.forEach((word, i) => {
        if (index + i < 12) {
          newWords[index + i] = word;
        }
      });
      setWords(newWords);

      // Focus on the last filled input or the last input
      const nextIndex = Math.min(index + pastedWords.length, 11);
      setTimeout(() => {
        inputRefs.current[nextIndex]?.focus();
      }, 0);
    }
  };

  const handleInput = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    // If multiple words pasted (space-separated), handle them
    if (value.includes(" ")) {
      const splitWords = value.split(/\s+/).filter((word) => word.length > 0);
      const newWords = [...words];
      splitWords.forEach((word, i) => {
        if (index + i < 12) {
          newWords[index + i] = word.trim();
        }
      });
      setWords(newWords);

      // Focus on the last filled input
      const nextIndex = Math.min(index + splitWords.length - 1, 11);
      setTimeout(() => {
        inputRefs.current[nextIndex]?.focus();
        inputRefs.current[nextIndex]?.select();
      }, 0);
      return;
    }

    // Only update the value, don't auto-advance
    // Auto-advance is handled by Space/Enter key in handleKeyDown
    handleWordChange(index, value.trim());
  };

  const handleRefreshMnemonic = async () => {
    if (!bip39Modules) return;
    const mnemonic = bip39Modules.generateMnemonic(bip39Modules.wordlist, 128);
    setWords(mnemonic.split(" "));
    // Focus first input after refresh
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 0);
  };

  const handleCreateWallet = async () => {
    if (!bip39Modules) return;
    
    // Derive Solana wallet from mnemonic in the main process
    // This avoids "process is not defined" errors in the renderer
    const mnemonic = words.join(" ");
    const { address, privateKey } = await window.electronAPI.deriveSolanaWallet(mnemonic);
    
    // Save the private key
    await window.electronAPI.saveWalletPrivateKey(privateKey);
    console.log("Create wallet clicked with Solana address:", address);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-custom-orange flex flex-col px-6">
      <div className="flex-1 flex justify-center py-6">
        <div className="w-full max-w-2xl space-y-4">
          {/* Heading with Back Arrow */}
          <div className="mb-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/")}
                className="hover:opacity-80 transition-opacity cursor-pointer p-1 -ml-2 align-top"
                aria-label="Go back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 text-primary"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
              <button
                onClick={handleRefreshMnemonic}
                className="ml-auto hover:opacity-80 transition-opacity cursor-pointer p-1 align-top"
                aria-label="Generate new mnemonic"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 text-primary"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </button>
            </div>
            <h1 className="inline text-lg font-bold text-primary">
              Enter your 12-word secret phrase to access an existing wallet, or
              randomly generate to create a new wallet.
            </h1>
          </div>

          {/* 12 Text Boxes Grid - OTP Style */}
          <div className="grid grid-cols-3 gap-3">
            {words.map((word, index) => (
              <div key={index} className="flex flex-col">
                <label className="text-xs text-primary/60 font-medium mb-1.5 text-center">
                  {index + 1}
                </label>
                <input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  value={word}
                  onChange={(e) => handleInput(index, e)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={(e) => handlePaste(e, index)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-black rounded-lg focus:border-primary focus:outline-none text-primary placeholder:text-primary/40 text-center font-medium transition-all"
                  placeholder={`Word ${index + 1}`}
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
            ))}
          </div>

          {/* Copy All Button */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                const fullPhrase = words.join(" ");
                navigator.clipboard.writeText(fullPhrase);
              }}
              className="cursor-pointer text-sm text-primary/80 hover:text-primary underline transition-colors"
            >
              Copy secret phrase
            </button>
          </div>

          {/* Warning Checkbox */}
          <div className="flex items-start flex-col gap-2">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={isWarning1Accepted}
                onChange={(e) => setIsWarning1Accepted(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label className="text-xs text-primary/80 cursor-pointer">
                Losing your secret phrase means losing access to your wallet
                forever.
              </label>
            </div>
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={isWarning2Accepted}
                onChange={(e) => setIsWarning2Accepted(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label className="text-xs text-primary/80 cursor-pointer">
                Anyone with access to your secret phrase can steal your funds.
              </label>
            </div>
          </div>

          {/* Create Wallet CTA */}
          <button
            onClick={handleCreateWallet}
            disabled={!isWarningAccepted || !isValid}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            Create Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
