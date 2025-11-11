import express from "express";
import { config } from "./config.js";
import cors from "cors";
import { requiresPayment } from "./middleware.js";
import { requiresSolanaPayment } from "./middlewareSolana.js";

const { port } = config;
const app = express();

app.use(
  cors({
    origin: "*",
    exposedHeaders: ["X-PAYMENT-RESPONSE"],
  })
);
app.use(express.json());

app.get(
  "/solana-weather",
  requiresSolanaPayment("$0.001", "Access to weather data", "solana-devnet"),
  (req, res) => {
    const city = req.query.city as string | undefined;
    const message = city
      ? `The weather in ${city} is sunny`
      : "The weather is sunny";
    res.send({ message });
  }
);

app.get(
  "/weather",
  (req, res) => {
    res.send({ message: "The weather is sunny" });
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
