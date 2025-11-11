import { exact } from "x402/schemes";
import {
  type Network,
  type Price,
  type Resource,
  settleResponseHeader,
} from "x402/types";
import {
  processPriceToAtomicAmount,
  findMatchingPaymentRequirements,
} from "x402/shared";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";

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
  return paymentRequirements;
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
  const paymentHeader = x402.extractPayment(req.headers);
  if (!paymentHeader) {
    res.status(402).json({
      x402Version,
      error: "X-PAYMENT header is required",
      accepts: paymentRequirements,
    });
    return false;
  }

  try {
    const verifiedPayment = await x402.verifyPayment(paymentHeader, paymentRequirements[0]!);
    console.log("verifiedPayment", verifiedPayment);
    if (!verifiedPayment.isValid) {
      res.status(402).json({
        x402Version,
        error: verifiedPayment.invalidReason,
        accepts: paymentRequirements,
        payer: verifiedPayment.payer,
      });
      return false;
    }
  } catch (error) {
    console.log("error", error);
    res.status(402).json({
      x402Version,
      error: error || "Payment verification failed",
      accepts: paymentRequirements,
    });
    return false;
  }

  return true;
}

/**
 * Verify and settle payment middleware
 */

export const requiresSolanaPayment =
  (price: Price, description: string, network: Network) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const resource =
      `${req.protocol}://${req.headers.host}${req.originalUrl}` as Resource;
    const paymentRequirement = await createExactPaymentRequirements(
      price,
      network,
      resource,
      description
    );
    const paymentRequirements = [paymentRequirement];
    const isValid = await verifyPayment(req, res, paymentRequirements);
    if (!isValid) return;

    const paymentHeader = x402.extractPayment(req.headers);

    try {
      const settleResponse = await x402.settlePayment(
        paymentHeader!,
        paymentRequirements[0]!
      );
      
      console.log("Payment settled:", settleResponse);

      // encode the settle response to base64
      const base64SettleResponse = Buffer.from(JSON.stringify(settleResponse)).toString('base64');
      res.setHeader("X-PAYMENT-RESPONSE", base64SettleResponse);
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
