#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { privateKey } from "./config.js";
import { createPaymentHeader } from "x402/client";
import {
  createSigner,
  PaymentRequirementsSchema,
  type PaymentRequirements,
} from "x402/types";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const app = express();
app.use(express.json());

interface PaymentRequiredRequest {
  x402Version: number;
  error?: string;
  paymentRequirements: PaymentRequirements[];
}

const PORT = 3000;

const main = async () => {
  /**
   * MCP Server to generate x-payment-token
   */

  // Create a new MCP server
  const server = new McpServer({
    name: "x402 Wallet",
    version: "1.0.0",
  });

  const transports = {
    streamable: {} as Record<string, StreamableHTTPServerTransport>,
    sse: {} as Record<string, SSEServerTransport>,
  };

  server.registerTool(
    "generate-x-payment-token",
    {
      title: "Generates xPaymentToken",
      description:
        "Generates an xPaymentToken that is required to call tools that require a payment.",
      inputSchema: {
        paymentRequiredRequest: z.object({
          x402Version: z.number(),
          error: z.string().optional(),
          paymentRequirements: z.array(PaymentRequirementsSchema),
        }),
      },
      outputSchema: { xPaymentToken: z.string() },
    },
    async (args) => {
      const { paymentRequiredRequest } = args;
      const { x402Version, paymentRequirements } = paymentRequiredRequest;
      const parsed = paymentRequirements.map((x) =>
        PaymentRequirementsSchema.parse(x)
      );

      // TODO: Support multiple payment requirements
      const selectedPaymentRequirement = parsed[0]!;
      const network = selectedPaymentRequirement.network;

      const signer = await createSigner(network, privateKey as `0x${string}`);
      const header = await createPaymentHeader(
        signer,
        x402Version,
        selectedPaymentRequirement
      );

      return {
        content: [
          {
            type: "text",
            text: "xPaymentToken generated successfully, use it to call the tool that required payment.",
          },
          {
            type: "text",
            text: `xPaymentToken: ${header}`,
          },
        ],
        structuredContent: { xPaymentToken: header },
      };
    }
  );

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("MCP x402 wallet running on stdio");

  // Streamable HTTP transport
  app.post("/mcp", async (req, res) => {
    // Create a new transport for each request to prevent request ID collisions
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // SSE transport (claude desktop)
  // Legacy SSE endpoint for older clients
  app.get("/sse", async (req, res) => {
    // Create SSE transport for legacy clients
    const transport = new SSEServerTransport("/messages", res);
    transports.sse[transport.sessionId] = transport;

    res.on("close", () => {
      delete transports.sse[transport.sessionId];
    });

    await server.connect(transport);
  });

  // Legacy message endpoint for older clients
  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.sse[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res, req.body);
    } else {
      res.status(400).send("No transport found for sessionId");
    }
  });

  app.listen(PORT, () => {
    console.log(`MCP x402 wallet running on http://localhost:${PORT}`);
  });
};

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
