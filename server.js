import dotenv from "dotenv";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";

import orderRoutes from "./routes/orderRoutes.js";
import csvRoutes from "./routes/csvRoutes.js";
import shopifyRoutes from "./routes/shopifyRoutes.js";
import authRoutes from "./routes/auth.js";

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";

import { typeDefs } from "./schema/typeDefs.js";
import { resolvers } from "./schema/resolvers.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log("Got request:", req.method, req.url);
  next();
});

// REST API routes
app.use("/api/orders", orderRoutes);
app.use("/api/csv", csvRoutes);
app.use("/api/shopify", shopifyRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => res.send("REST API works!"));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack || err.message);
  res.status(500).json({ error: err.message || "Server Error" });
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/Ikkasa_Admin", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err);
});

// Apollo Server setup
const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

app.use(
  "/graphql",
  cors(),
  express.json(),
  expressMiddleware(server)
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/graphql`);
});

export default app;
