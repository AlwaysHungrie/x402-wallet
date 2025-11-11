# x402 Wallet

x402 Wallet allows existing desktop AI clients such as Claude Desktop, Cursor, etc. to access x402-enabled API and paid MCP servers natively.

x402 Wallet is an electron app that needs to be running while using your desktop client. It consists of a 
 - Solana wallet which needs to be setup and funded with SOL and USDC. 
 - MCP server that needs to be configured in the desktop client.

Once the x402 wallet is running, you can call any paid api endpoint (such as /seller/api-server) or access paid tools of existing MCP servers (such as /seller/mcp-server) from within the desktop client.

[Insert demo video here]

## Project Setup

This project consits for three parts:

1. Api Server

This is a sample express server that demonstrates how to to monetize an express api endpoint. See [seller/api-server/README.md](seller/api-server/README.md) for more details.

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
