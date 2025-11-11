#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { registerPaidTool } from "./middleware.js";
import { registerPaidSolanaTool } from "./middlewareSolana.js";

/**
 * MCP Server with a multiply tool
 */
async function main() {
  // Create a new MCP server
  const server = new McpServer({
    name: "multiply-server",
    version: "1.0.0",
  });

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

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("MCP multiply server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
