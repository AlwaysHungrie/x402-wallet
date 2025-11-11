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
} from "x402/shared";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";

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

/**
 * Verifies a payment and handles the response
 *
 * @param req - The Express request object
 * @param res - The Express response object
 * @param paymentRequirements - The payment requirements to verify against
 * @returns A promise that resolves to true if payment is valid, false otherwise
 */
async function verifyPayment(
  req: Request,
  res: Response,
  paymentRequirements: PaymentRequirements[]
): Promise<boolean> {
  const payment = req.header("X-PAYMENT");
  console.log("payment", payment);
  if (!payment) {
    res.status(402).json({
      x402Version,
      error: "X-PAYMENT header is required",
      accepts: paymentRequirements,
    });
    return false;
  }

  let decodedPayment: PaymentPayload;
  try {
    decodedPayment = exact.evm.decodePayment(payment);
    console.log("decodedPayment", decodedPayment);
    decodedPayment.x402Version = x402Version;
  } catch (error) {
    res.status(402).json({
      x402Version,
      error: error || "Invalid or malformed payment header",
      accepts: paymentRequirements,
    });
    return false;
  }

  try {
    const selectedPaymentRequirement =
      findMatchingPaymentRequirements(paymentRequirements, decodedPayment) ||
      paymentRequirements[0];
    console.log("selectedPaymentRequirement", selectedPaymentRequirement);
    if (!selectedPaymentRequirement) {
      throw new Error("No matching payment requirement found");
    }
    const response = await verify(decodedPayment, selectedPaymentRequirement);
    console.log("response", response);
    if (!response.isValid) {
      res.status(402).json({
        x402Version,
        error: response.invalidReason,
        accepts: paymentRequirements,
        payer: response.payer,
      });
      return false;
    }
  } catch (error) {
    console.log("error", error);
    res.status(402).json({
      x402Version,
      error,
      accepts: paymentRequirements,
    });
    return false;
  }

  return true;
}

/**
 * Verify and settle payment middleware
 */

export const requiresPayment =
  (price: Price, description: string, network: Network) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const resource =
      `${req.protocol}://${req.headers.host}${req.originalUrl}` as Resource;
    const paymentRequirements = [
      createExactPaymentRequirements(
        price,
        network,
        resource,
        description
      ),
    ];
    const isValid = await verifyPayment(req, res, paymentRequirements);
    if (!isValid) return;

    try {
      const settleResponse = await settle(
        exact.evm.decodePayment(req.header("X-PAYMENT")!),
        paymentRequirements[0]!
      );
      const responseHeader = settleResponseHeader(settleResponse);
      console.log("Payment settled:", responseHeader);
      res.setHeader("X-PAYMENT-RESPONSE", responseHeader);
      next();
    } catch (error) {
      console.error("Payment settlement failed:", error);
      res.status(402).json({
        x402Version,
        error: error || "Payment settlement failed",
        accepts: paymentRequirements,
      });
    }
  };
