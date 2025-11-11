# x402 Wallet

This is an electron app that creates a solana wallet and an MCP server that exposes a tool that allows the agent call any paid api endpoint (such as /seller/api-server) or access paid tools of existing MCP servers (such as /seller/mcp-server) from within the desktop client.

## Setup

```bash
npm install
npm run dev

# or to create a distributable package

npm run make
# install the created dmg file to your applications folder
```

## Usage

1. Creating wallet
2. Adding API config
3. Adding MCP server to the desktop client