import express from "express";
import { restrictEmail } from "../middleware/restrictEmail.js";
import { signup, login } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", restrictEmail, signup);
router.post("/login", restrictEmail, login);

export default router;
