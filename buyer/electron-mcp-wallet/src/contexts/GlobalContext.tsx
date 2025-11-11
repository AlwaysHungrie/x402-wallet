import { createContext, useContext, useState, ReactNode } from "react";

interface GlobalContextType {
  privateKey: string | null;
  setPrivateKey: (key: string | null) => void;
  port: number | null;
  setPort: (port: number | null) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(
  undefined
);

export function GlobalProvider({ children }: { children: ReactNode }) {
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [port, setPort] = useState<number | null>(null);

  return (
    <GlobalContext.Provider
      value={{ privateKey, setPrivateKey, port, setPort }}
    >
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobalContext() {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
}
