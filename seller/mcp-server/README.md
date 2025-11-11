# MCP Server

This MCP server that presents a middleware to add to any existing MCP server to make it paid using the x402 standard. Paid tools require wallets such as x402 wallet in order to be accessed.

Required environment variables:

- PORT: The port number to run the server on.
- SOLANA_SELLER_ADDRESS: The address of the seller on Solana.

## Important Note

The Solana seller address needs to be an ATA (Associated Token Account). An easy way to do it is to import the address to any wallet and use it to once to send/receive USDC.

## Setup

```bash
pnpm install
pnpm run build
pnpm run start
```

# Middleware

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

## Adding this mcp server

Once the server is built and is also running, it can be added to any mcp client such as Claude Desktop, Cursor, etc. by adding to the mcp config file.

```json
{
  "mcpServers": {
    "multiply-server": {
      "command": "node",
      "args": [
        "/{path-to-repo}/x402-test/seller/mcp-server/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production",
        "SELLER_ADDRESS": "",
        "SOLANA_SELLER_ADDRESS": "",
        "NETWORK": "base-sepolia",
        "SOLANA_NETWORK": "solana-devnet",
        "X402_VERSION": "1"
      }
    }
  }
}
```

After restarting the client, Claude Desktop will be able to use multiply tool if it decides to do so. 
However the tool will only run successfull if it also has x402 wallet running and it uses the wallet to pay for the tool by sending USDC to the seller's wallet.