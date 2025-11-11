import {} from "viem";
import { privateKeyToAccount } from "viem/accounts";

try {
  if (process.env.NODE_ENV !== "production") {
    const dotenv = await import("dotenv");
    dotenv.config();
  }
} catch {
  // ignore
  // env will be loaded from claude config
}

export const privateKey = process.env.PRIVATE_KEY;
