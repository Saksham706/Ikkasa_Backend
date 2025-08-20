import express from "express";
import multer from "multer";
import { uploadCSV, getOrders, updateOrder, deleteOrder } from "../controllers/csvController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), uploadCSV);
router.get("/", getOrders);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);

export default router;
