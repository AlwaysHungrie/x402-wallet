# MCP Multiply Server

An MCP (Model Context Protocol) server that provides a tool to multiply two numbers.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Build the project:
   ```bash
   pnpm run build
   ```

3. Run in development mode:
   ```bash
   pnpm run dev
   ```

## Adding to Claude Desktop

To use this MCP server with Claude Desktop, you need to add it to your Claude Desktop configuration file.

### macOS

1. Open the Claude Desktop configuration file:
   ```bash
   open ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

   If the file doesn't exist, create it:
   ```bash
   mkdir -p ~/Library/Application\ Support/Claude
   touch ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. Add the MCP server configuration. Replace `/path/to/x402-test` with the actual path to your project:

   ```json
   {
     "mcpServers": {
       "multiply-server": {
         "command": "node",
         "args": [
           "/path/to/x402-test/seller/mcp-server/dist/index.js"
         ]
       }
     }
   }
   ```

   **Using pnpm:**
   If you want to use pnpm to run the server (recommended for development), you can use:

   ```json
   {
     "mcpServers": {
       "multiply-server": {
         "command": "pnpm",
         "args": [
           "--dir",
           "/path/to/x402-test/seller/mcp-server",
           "start"
         ]
       }
     }
   }
   ```

   **Using tsx (for development):**
   For development with hot reload:

   ```json
   {
     "mcpServers": {
       "multiply-server": {
         "command": "pnpm",
         "args": [
           "--dir",
           "/path/to/x402-test/seller/mcp-server",
           "exec",
           "tsx",
           "src/index.ts"
         ]
       }
     }
   }
   ```

### Windows

1. Open the Claude Desktop configuration file:
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

2. Add the same configuration as above, using Windows-style paths.

### Linux

1. Open the Claude Desktop configuration file:
   ```bash
   ~/.config/Claude/claude_desktop_config.json
   ```

2. Add the same configuration as above.

## Example Configuration

Here's a complete example configuration file:

```json
{
  "mcpServers": {
    "multiply-server": {
      "command": "node",
      "args": [
        "/Users/always_hungrie/psyduck/x402-test/seller/mcp-server/dist/index.js"
      ]
    }
  }
}
```

## Restart Claude Desktop

After adding the configuration, restart Claude Desktop for the changes to take effect.

## Usage

Once configured, you can use the multiply tool in Claude Desktop by asking Claude to multiply two numbers. For example:

- "Multiply 5 and 7"
- "What's 12 times 8?"
- "Use the multiply tool to calculate 3.14 * 2.5"

## Troubleshooting

- Make sure the path to the server file is correct and absolute
- Ensure Node.js is in your PATH
- Check that you've built the project (`pnpm run build`) if using the compiled version
- Check Claude Desktop's logs for any error messages

