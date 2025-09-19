import express from "express";
import { createEkartReturn } from "../controllers/ekartController.js";

const router = express.Router();

router.post("/return", createEkartReturn);

export default router;
