import { exact } from "x402/schemes";
import {
  type Network,
  type Price,
  type Resource,
  settleResponseHeader,
} from "x402/types";
import {
  processPriceToAtomicAmount,
  decodeXPaymentResponse,
} from "x402/shared";
import { config } from "./config.js";
import type {
  McpServer,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import z, { type ZodRawShape } from "zod";

const { solanaSellerAddress, solanaNetwork, x402Version } = config;
const facilitatorUrl = solanaNetwork.url;

import { X402PaymentHandler, type PaymentRequirements } from 'x402-solana/server';

const x402 = new X402PaymentHandler({
  network: solanaNetwork.network as "solana-devnet" | "solana",
  treasuryAddress: solanaSellerAddress,
  facilitatorUrl: facilitatorUrl,
});

/**
 * Creates payment requirements for a given price and network
 *
 * @param price - The price to be paid for the resource
 * @param network - The blockchain network to use for payment
 * @param resource - The resource being accessed
 * @param description - Optional description of the payment
 * @returns An array of payment requirements
 */
async function createExactPaymentRequirements(
  price: Price,
  network: Network, 
  resource: Resource,
  description = ""
): Promise<PaymentRequirements> {
  const atomicAmountForAsset = processPriceToAtomicAmount(price, network);
  if ("error" in atomicAmountForAsset) {
    throw new Error(atomicAmountForAsset.error);
  }
  const { maxAmountRequired, asset } = atomicAmountForAsset;
  const paymentRequirements = await x402.createPaymentRequirements({
    price: {
      amount: maxAmountRequired.toString(),
      asset: {
        address: asset.address,
        decimals: 6,
      }
    },
    network: 'solana-devnet',
    config: {
      description,
      resource,
    }
  })
  // paymentRequirements.extra = {
  //   ...paymentRequirements.extra,
  //   feePayer: solanaSellerAddress,
  // };
  return paymentRequirements;
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
  try {
    const verifiedPayment = await x402.verifyPayment(xPaymentToken, paymentRequirements[0]!);
    if (!verifiedPayment.isValid) {
      return {
        isVerified: false,
        paymentRequiredRequest: {
          x402Version,
          error: verifiedPayment.invalidReason || "Payment verification failed",
          paymentRequirements,
        },
      };
    }
  } catch (error) {
    return {
      isVerified: false,
      paymentRequiredRequest: {
        x402Version,
        error: error instanceof Error ? error.message : "Payment verification failed",
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

export const registerPaidSolanaTool = async <
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
  const paymentRequirement = await createExactPaymentRequirements(
    price,
    solanaNetwork.network,
    resource,
    description
  );
  const paymentRequirements = [paymentRequirement];

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
        const settleResponse = await x402.settlePayment(
          xPaymentToken as string,
          paymentRequirements[0]!
        );

        const paymentResponse = {
          success: settleResponse.success,
          transaction: settleResponse.transaction.toString(),
          network: settleResponse.network.toString(),
          payer: settleResponse?.payer?.toString() || "",
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
