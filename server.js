import dotenv from "dotenv";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import orderRoutes from "./routes/orderRoutes.js";
import csvRoutes from "./routes/csvRoutes.js";
import shopifyRoutes from './routes/shopifyRoutes.js';
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/orders", orderRoutes);
app.use("/api/csv", csvRoutes);
app.use("/api/shopify", shopifyRoutes);
app.use("/api/auth", authRoutes);


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));


const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


export default app;
