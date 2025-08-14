// routes/orderRoutes.js
import express from "express";
import multer from "multer";
import { uploadCSV, getOrders, updateOrder, deleteOrder } from "../controllers/csvController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Upload CSV & save multiple orders
router.post("/upload", upload.single("file"), uploadCSV);

// Get all orders
router.get("/", getOrders);

// Update order by ID
router.put("/:id", updateOrder);

// Delete order by ID
router.delete("/:id", deleteOrder);

export default router;
