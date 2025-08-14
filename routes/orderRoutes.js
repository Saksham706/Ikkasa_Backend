import express from "express";
import { createOrder, getOrders, updateOrder, deleteOrder } from "../controllers/orderController.js";

const router = express.Router();

// Create manual order
router.post("/", createOrder);

// Get all orders
router.get("/", getOrders);

// Update order
router.put("/:id", updateOrder);

// Delete order
router.delete("/:id", deleteOrder);

export default router;
