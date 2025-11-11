"use client";

import { withPaymentInterceptor, decodeXPaymentResponse, createSigner, type Signer } from "x402-axios";
import axios from "axios";

class ApiClient {
  private signer: Signer;
  private api: ReturnType<typeof withPaymentInterceptor>;

  constructor(signer: Signer) {
    try {
      this.signer = signer;
      this.api = withPaymentInterceptor(
        axios.create({
          baseURL: "http://localhost:3001",
        }),
        this.signer
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async getWeather() {
    try {
      const response = await this.api.get("/weather");

      const paymentResponse = decodeXPaymentResponse(
        response.headers["x-payment-response"]
      );
      console.log(paymentResponse);

      return { data: response.data, paymentResponse };
    } catch (error: any) {
      console.error(error.response?.data?.error);
      throw error;
    }
  }
}

export default ApiClient;
