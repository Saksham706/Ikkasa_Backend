import express from "express";
import {
  syncOrders,
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder
} from "../controllers/shopifyController.js";

const router = express.Router();

// Route to sync orders from Shopify
router.get("/sync-orders", syncOrders);

// CRUD routes for orders
router.get("/orders", getOrders);
router.post("/orders", createOrder);
router.get("/orders/:id", getOrderById);
router.put("/orders/:id", updateOrder);
router.delete("/orders/:id", deleteOrder);

// Test route (optional)
router.get("/test", (req, res) => {
  res.send("Shopify test route working.");
});

export default router;
