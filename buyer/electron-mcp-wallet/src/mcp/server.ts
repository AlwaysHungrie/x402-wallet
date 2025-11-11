// Polyfill for browser APIs in Node.js environment
if (typeof globalThis.window === "undefined") {
  (globalThis as any).window = globalThis;
}

// Polyfill atob and btoa for base64 encoding/decoding
if (typeof globalThis.atob === "undefined") {
  globalThis.atob = (str: string) => Buffer.from(str, "base64").toString("binary");
}

if (typeof globalThis.btoa === "undefined") {
  globalThis.btoa = (str: string) => Buffer.from(str, "binary").toString("base64");
}

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { PaymentRequirementsSchema } from "x402-solana/types";
import { createServer } from "node:net";
import { Keypair } from "@solana/web3.js";
import { createSolanaPaymentHeader, keypairToWalletAdapter } from "./solanaTxn";
import { getApiConfigs, type ApiConfig } from "../lib/apiConfig";
import { createX402Client } from "x402-solana/client";

let app: express.Application | null = null;
let serverInstance: any = null;

/**
 * Finds an available port starting from the given port number.
 * @param startPort The port number to start checking from (default: 3000)
 * @returns A promise that resolves to an available port number
 */
export async function findAvailablePort(
  startPort: number = 3000
): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.listen(startPort, () => {
      const port = (server.address() as { port: number })?.port;
      server.close(() => {
        resolve(port);
      });
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        // Port is in use, try the next one
        console.log(`Port ${startPort} is in use, trying ${startPort + 1}`);
        findAvailablePort(startPort + 1)
          .then(resolve)
          .catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

export function startServer(
  privateKey: string,
  port?: number
): Promise<number> {
  return new Promise(async (resolve, reject) => {
    if (app) {
      reject(new Error("Server is already running"));
      return;
    }

    // Find an available port if not specified
    const actualPort = await findAvailablePort(port ?? 3000);

    app = express();

    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    if (!privateKey) {
      reject(new Error("Private key not found."));
      return;
    }

    console.log("Starting MCP server");

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

        const solanaSigner = Keypair.fromSecretKey(
          Uint8Array.from(JSON.parse(privateKey))
        );
        const header = await createSolanaPaymentHeader(
          solanaSigner,
          x402Version,
          selectedPaymentRequirement,
          "https://api.devnet.solana.com"
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

    // Load and register API configs as tools
    try {
      const apiConfigsData = await getApiConfigs();
      if (
        apiConfigsData &&
        apiConfigsData.configs &&
        apiConfigsData.configs.length > 0
      ) {
        // Helper function to safely evaluate zod schema strings
        const evaluateZodSchema = (schemaString: string): any => {
          if (!schemaString || !schemaString.trim()) {
            return z.any();
          }
          try {
            // Use Function constructor to safely evaluate the schema string
            // This allows us to evaluate zod schema strings like "z.object({ param: z.string() })"
            const func = new Function("z", `return ${schemaString}`);
            return func(z);
          } catch (error) {
            console.error(
              `Error evaluating zod schema: ${schemaString}`,
              error
            );
            return z.any();
          }
        };

        for (const config of apiConfigsData.configs) {
          if (!config.endpoint) {
            console.warn(`Skipping config ${config.id}: missing endpoint`);
            continue;
          }

          try {
            // Parse input schema (queryParamsSchema)
            const inputSchema = evaluateZodSchema(
              config.queryParamsSchema || ""
            );

            // Parse output schema
            const outputSchema = evaluateZodSchema(config.outputSchema || "");

            // Use the name field for the tool name, fallback to id or endpoint-based name
            const toolName =
              config.name ||
              config.id ||
              `api-${config.endpoint.replace(/[^a-zA-Z0-9]/g, "-")}`;

            // Convert zod schema to the format expected by MCP server
            let inputSchemaObj: Record<string, any>;
            if (inputSchema instanceof z.ZodObject) {
              // If it's a ZodObject, use its shape
              inputSchemaObj = inputSchema.shape;
            } else {
              // Otherwise, wrap it in a params object
              inputSchemaObj = { params: inputSchema };
            }

            let outputSchemaObj: Record<string, any>;
            if (outputSchema instanceof z.ZodObject) {
              // If it's a ZodObject, use its shape
              outputSchemaObj = outputSchema.shape;
            } else {
              // Otherwise, wrap it in a result object
              outputSchemaObj = { result: outputSchema };
            }

            server.registerTool(
              toolName,
              {
                title: config.description || config.endpoint,
                description:
                  config.description || `Call API endpoint: ${config.endpoint}`,
                inputSchema: inputSchemaObj,
                outputSchema: outputSchemaObj,
              },
              async (args: any) => {
                try {
                  // Build URL with query parameters
                  const url = new URL(config.endpoint);
                  Object.entries(args).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                      url.searchParams.append(key, String(value));
                    }
                  });

                  const solanaSigner = Keypair.fromSecretKey(
                    Uint8Array.from(JSON.parse(privateKey))
                  );
                  const wallet = await keypairToWalletAdapter(solanaSigner);
                  const solanaClient = createX402Client({
                    wallet,
                    network: "solana-devnet",
                  });

                  // Make the API call
                  const response = await solanaClient.fetch(url.toString(), {
                    method: config.method || "GET",
                  });

                  // Decode the X-PAYMENT-RESPONSE header
                  const paymentResponseHeader =
                    response.headers.get("X-PAYMENT-RESPONSE");
                  let paymentResponse = null;

                  if (paymentResponseHeader) {
                    try {
                      // Decode from base64 and parse JSON
                      const decodedString = Buffer.from(paymentResponseHeader, 'base64').toString('utf-8');
                      paymentResponse = JSON.parse(decodedString);
                    } catch (error) {
                      console.error(
                        "Failed to decode payment response header:",
                        error
                      );
                    }
                  }

                  if (!response.ok) {
                    throw new Error(
                      `API call failed: ${response.status} ${response.statusText} ${response.body}`
                    );
                  }

                  const data = await response.json();

                  return {
                    content: [
                      {
                        type: "text" as const,
                        text: JSON.stringify(data, null, 2),
                      },
                      {
                        type: "text" as const,
                        text: `Transaction hash: ${paymentResponse.transaction}`,
                      }
                    ],
                    structuredContent: data,
                  };
                } catch (error) {
                  const errorMessage =
                    error instanceof Error ? error.message : String(error);
                  return {
                    content: [
                      {
                        type: "text" as const,
                        text: `Error calling API ${config.endpoint}: ${errorMessage}`,
                      },
                    ],
                    isError: true,
                  };
                }
              }
            );
          } catch (error) {
            console.error(
              `Error registering tool for config ${config.id}:`,
              error
            );
          }
        }
      } else {
        console.log("No API configs found to load");
      }
    } catch (error) {
      console.error("Error loading API configs:", error);
      // Don't fail server startup if configs can't be loaded
    }

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

    // Start the server
    try {
      serverInstance = app.listen(actualPort, () => {
        console.log(`Express server started on port ${actualPort}`);
        resolve(actualPort);
      });

      serverInstance.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          // Port is in use, try to find another available port
          // Close the failed server first
          if (serverInstance) {
            serverInstance.close();
          }
          findAvailablePort(actualPort + 1)
            .then((newPort) => {
              // Try again with the new port
              serverInstance = app!.listen(newPort, () => {
                console.log(`Express server started on port ${newPort}`);
                resolve(newPort);
              });
              serverInstance.on(
                "error",
                (retryError: NodeJS.ErrnoException) => {
                  reject(retryError);
                }
              );
            })
            .catch(reject);
        } else {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }

    return actualPort;
  });
}

export function stopServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!serverInstance) {
      reject(new Error("Server is not running"));
      return;
    }

    const currentServer = serverInstance;
    let isResolved = false;
    let forceCloseTimeout: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (forceCloseTimeout) {
        clearTimeout(forceCloseTimeout);
        forceCloseTimeout = null;
      }
    };

    const finish = (err?: Error) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();

      if (err) {
        reject(err);
      } else {
        app = null;
        serverInstance = null;
        console.log("Express server stopped");
        resolve();
      }
    };

    // Close all connections first (Node.js 18.2.0+)
    if (typeof currentServer.closeAllConnections === "function") {
      currentServer.closeAllConnections();
    }

    // Close the server
    currentServer.close((err?: Error) => {
      finish(err);
    });

    // Force close after a timeout if it doesn't close naturally
    forceCloseTimeout = setTimeout(() => {
      if (!isResolved && serverInstance === currentServer) {
        console.log("Force closing server...");
        if (typeof currentServer.closeAllConnections === "function") {
          currentServer.closeAllConnections();
        }
        currentServer.close(() => {
          finish();
        });
      }
    }, 5000);
  });
}

export function isServerRunning(): boolean {
  return app !== null && serverInstance !== null;
}
