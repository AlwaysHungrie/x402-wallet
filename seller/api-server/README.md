# Api Server

This is a sample express server that demonstrates how to to monetize an express api endpoint. 

Required environment variables:

- PORT: The port number to run the server on.
- SOLANA_SELLER_ADDRESS: The address of the seller on Solana.
- NETWORK: The network to use for the seller (e.g. `"solana-devnet"`)

## Important Note

The Solana seller address needs to be an ATA (Associated Token Account). An easy way to do it is to import the address to any wallet and use it to once to send/receive USDC.

## Setup

```bash
pnpm install
pnpm run build
pnpm run start
```

# Middleware

Using `requiresSolanaPayment` middleware, you can monetize any api existing api

```typescript
app.get(
  "/weather",
  (req, res) => {
    res.send({ message: "The weather is sunny" });
  }
);
```

like this: 

```typescript
app.get(
  "/weather",
  requiresSolanaPayment("$0.001", "Access to weather data", "solana-devnet"),
  (req, res) => {
    res.send({ message: "The weather is sunny" });
  }
);
```

Calling this api will now require the user to pay $0.001 in USDC to your wallet. This payment is part of the x402 standard and will be automatically handled by any compatible clients such as browsers, apps, etc.