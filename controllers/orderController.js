import Order from "../models/Order.js";
import { calcVolumetricWeight } from "../utils/calcVolWeight.js";

// Create order
export const createOrder = async (req, res) => {
  try {
    const data = req.body;
    data.volumetricWeight = calcVolumetricWeight(data.length, data.breadth, data.height);

    const order = await Order.create(data);
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all orders
export const getOrders = async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
};

// Update order
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (data.length && data.breadth && data.height) {
      data.volumetricWeight = calcVolumetricWeight(data.length, data.breadth, data.height);
    }
    const order = await Order.findByIdAndUpdate(id, data, { new: true });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete order
export const deleteOrder = async (req, res) => {
  await Order.findByIdAndDelete(req.params.id);
  res.json({ message: "Order deleted" });
};
