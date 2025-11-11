# x402 Wallet

[DEMO VIDEO](https://x.com/Always_Hungrie_/status/1988385764623953935)

x402 Wallet allows existing desktop AI clients such as Claude Desktop, Cursor, etc. to access x402-enabled API and paid MCP servers natively.

x402 Wallet is an electron app that needs to be running while using your desktop client. It consists of a 
 - Solana wallet which needs to be setup and funded with SOL and USDC. 
 - MCP server that needs to be configured in the desktop client.

Once the x402 wallet is running, you can call any paid api endpoint (such as [seller/api-server](seller/api-server)) or access paid tools of existing MCP servers (such as [seller/mcp-server](seller/mcp-server)) from within the desktop client.

## Project Setup

This project consits for three parts:

1. Api Server - which creates a paid api

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

2. MCP Server - which creates a paid MCP server

This is a sample MCP server that demonstrates how to to monetize an MCP server. See [seller/mcp-server/README.md](seller/mcp-server/README.md) for more details.

Once setup and configured, applications like Claude Desktop will be able to use paid tools (like multiply tool in this example) if it decides to do so. 
However the tool will only run successfull if it also has x402 wallet running and it uses the wallet to pay for the tool by sending USDC to the seller's wallet.

Using `registerPaidSolanaTool` middleware, you can monetize any tool in an existing MCP server.

```typescript
const server = new McpServer({
  name: "multiply-server",
  version: "1.0.0",
});
```

can be monetized like this:

```typescript
await registerPaidSolanaTool(
  server,
  "multiply",
  {
    price: "$0.01",
    description:
      "Multiply two numbers together.",
  },
  { a: z.number(), b: z.number() },
  { result: z.number().optional() },
  async (args, extra) => {
    const { a, b } = args;
    const result = a * b;
    return {
      content: [
        {
          type: "text",
          text: `The result of multiplying ${a} and ${b} is ${result}`,
        },
      ],
      structuredContent: {
        result: result,
      },
    };
  }
);
```

3. x402 Wallet - which is a desktop app that allows you to run the MCP server and the api server

This is an electron app that creates a solana wallet and an MCP server that exposes a tool that allows the agent call any paid api endpoint (such as /seller/api-server) or access paid tools of existing MCP servers (such as /seller/mcp-server) from within the desktop client.

See [buyer/electron-mcp-wallet/README.md](buyer/electron-mcp-wallet/README.md) for more details.

Exact usage details can be found in the [DEMO VIDEO](https://x.com/Always_Hungrie_/status/1988385764623953935)