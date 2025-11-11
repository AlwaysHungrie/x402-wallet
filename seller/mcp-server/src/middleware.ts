import { exact } from "x402/schemes";
import {
  type Network,
  type PaymentPayload,
  type PaymentRequirements,
  type Price,
  type Resource,
  settleResponseHeader,
} from "x402/types";
import { useFacilitator } from "x402/verify";
import {
  processPriceToAtomicAmount,
  findMatchingPaymentRequirements,
  decodeXPaymentResponse,
} from "x402/shared";
import { config } from "./config.js";
import type {
  McpServer,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import z, { ZodObject, type AnyZodObject, type ZodRawShape } from "zod";

const { sellerAddress, network, x402Version } = config;
const facilitatorUrl = network.url;
const { verify, settle } = useFacilitator({ url: facilitatorUrl });

/**
 * Creates payment requirements for a given price and network
 *
 * @param price - The price to be paid for the resource
 * @param network - The blockchain network to use for payment
 * @param resource - The resource being accessed
 * @param description - Optional description of the payment
 * @returns An array of payment requirements
 */
function createExactPaymentRequirements(
  price: Price,
  network: Network,
  resource: Resource,
  description = ""
): PaymentRequirements {
  const atomicAmountForAsset = processPriceToAtomicAmount(price, network);
  if ("error" in atomicAmountForAsset) {
    throw new Error(atomicAmountForAsset.error);
  }
  const { maxAmountRequired, asset } = atomicAmountForAsset;

  let extra: {
    name?: string;
    version?: string;
  } = {};
  if ("eip712" in asset) {
    extra.name = asset.eip712.name;
    extra.version = asset.eip712.version;
  }

  return {
    scheme: "exact",
    network,
    maxAmountRequired,
    resource,
    description,
    mimeType: "",
    payTo: sellerAddress,
    maxTimeoutSeconds: 60,
    asset: asset.address,
    outputSchema: undefined,
    extra,
  };
}

interface PaymentRequiredRequest {
  x402Version: number;
  error?: string;
  paymentRequirements: PaymentRequirements[];
}

/**
 * Verifies a payment and handles the response
 *
 * @param req - The Express request object
 * @param res - The Express response object
 * @param paymentRequirements - The payment requirements to verify against
 * @returns A promise that resolves to true if payment is valid, false otherwise
 */
async function verifyPayment(
  xPaymentToken: string | undefined,
  paymentRequirements: PaymentRequirements[]
): Promise<{
  isVerified: boolean;
  paymentRequiredRequest: PaymentRequiredRequest | undefined;
}> {
  const payment = xPaymentToken;
  if (!payment) {
    return {
      isVerified: false,
      paymentRequiredRequest: {
        x402Version,
        error: "Generate and send an xPayment token to use this tool",
        paymentRequirements,
      },
    };
  }

  let decodedPayment: PaymentPayload;
  try {
    decodedPayment = exact.evm.decodePayment(payment);
    decodedPayment.x402Version = x402Version;
  } catch (error) {
    return {
      isVerified: false,
      paymentRequiredRequest: {
        x402Version,
        error: "Invalid or malformed xPayment token",
        paymentRequirements,
      },
    };
  }

  try {
    const selectedPaymentRequirement =
      findMatchingPaymentRequirements(paymentRequirements, decodedPayment) ||
      paymentRequirements[0];
    if (!selectedPaymentRequirement) {
      throw new Error("No matching payment requirement found");
    }
    const response = await verify(decodedPayment, selectedPaymentRequirement);
    if (!response.isValid) {
      return {
        isVerified: false,
        paymentRequiredRequest: {
          x402Version,
          error:
            "xPayment token does not match the requested payment requirements",
          paymentRequirements,
        },
      };
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return {
      isVerified: false,
      paymentRequiredRequest: {
        x402Version,
        error: "Internal server error while verifying xPayment token",
        paymentRequirements,
      },
    };
  }

  return {
    isVerified: true,
    paymentRequiredRequest: undefined,
  };
}

export interface PaidToolOptions {
  price: Price;
  description: string;
}

export const registerPaidTool = <
  TInputSchema extends ZodRawShape,
  TOutputSchema extends ZodRawShape
>(
  server: McpServer,
  name: string,
  { price, description }: PaidToolOptions,
  inputSchema: TInputSchema,
  outputSchema: TOutputSchema,
  callback: ToolCallback<TInputSchema>
) => {
  const resource = `mcp://${name}` as Resource;
  const paymentRequirements = [
    createExactPaymentRequirements(
      price,
      network.network,
      resource,
      description
    ),
  ];

  type ExtendedInputSchema = TInputSchema & { xPaymentToken: z.ZodOptional<z.ZodString> };
  type OriginalInput = z.infer<z.ZodObject<TInputSchema>>;


  // Create extended input schema with xPaymentToken
  const extendedInputSchema: ExtendedInputSchema = {
    ...inputSchema,
    xPaymentToken: z.string().optional(),
  };

  server.registerTool(
    name,
    {
      title: `${name} (Paid)`,
      description,
      inputSchema: extendedInputSchema,
      outputSchema: {
        ...outputSchema,
        requiresXPaymentToken: z.boolean(),
        paymentRequiredRequest: z
          .object({
            x402Version: z.number(),
            error: z.string(),
            paymentRequirements: z.array(
              z.object({
                scheme: z.string(),
                network: z.string(),
                maxAmountRequired: z.string(),
                asset: z.string(),
                resource: z.string().optional(),
                description: z.string().optional(),
                mimeType: z.string().optional(),
                payTo: z.string(),
                maxTimeoutSeconds: z.number(),
                outputSchema: z.any().optional(),
                extra: z.any().optional(),
              })
            ),
          })
          .optional(),
        paymentResponse: z.object({
          success: z.boolean(),
          transaction: z.string(),
          network: z.string(),
          payer: z.string(),
        }).optional(),
      },
    },
    (async (args: any, extra: any) => {
      const { xPaymentToken, ...restArgs } = args;

      const { isVerified, paymentRequiredRequest } = await verifyPayment(
        xPaymentToken as string | undefined,
        paymentRequirements
      );
      if (!isVerified) {
        return {
          content: [
            {
              type: "text",
              text: `A payment is required. To proceed, generate an x-payment token and call this tool again with the xPaymentToken parameter.`,
            },
            {
              type: "text",
              text: `Structured paymentRequiredRequest: ${JSON.stringify(paymentRequiredRequest)}`,
            }
          ],
          structuredContent: {
            requiresXPaymentToken: true,
            paymentRequiredRequest: paymentRequiredRequest,
          },
        };
      }
      try {
        const settleResponse = await settle(
          exact.evm.decodePayment(xPaymentToken as string),
          paymentRequirements[0]!
        );
        const responseHeader = settleResponseHeader(settleResponse);
        const paymentResponseResult = decodeXPaymentResponse(responseHeader);
        const paymentResponse = {
          success: paymentResponseResult.success,
          transaction: paymentResponseResult.transaction.toString(),
          network: paymentResponseResult.network.toString(),
          payer: paymentResponseResult.payer.toString(),
        };

        const result = await callback(restArgs as OriginalInput, extra);
        return {
          content: [
            ...result.content,
            {
              type: "text",
              text: `Transaction hash: ${paymentResponse.transaction}`,
            },
          ],
          structuredContent: {
            requiresXPaymentToken: false,
            ...result.structuredContent,
            paymentResponse,
          },
        };
      } catch (error) {
        console.error("Payment settlement failed:", error);
        return {
          content: [
            {
              type: "text",
              text: "Payment settlement failed",
            },
          ],
        };
      }
    }) as unknown as ToolCallback<ExtendedInputSchema>
  );
};
