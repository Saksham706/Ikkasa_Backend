import { parseCSV } from "../utils/csvParser.js";
import Order from "../models/Order.js";
import { calcVolumetricWeight } from "../utils/calcVolWeight.js";

// Upload CSV & save orders
export const uploadCSV = async (req, res) => {
  try {
    const rows = await parseCSV(req.file.path);

    const ordersData = rows.map(row => ({
      orderId: row["Order ID"],
      orderDate: row["Date"],
      customerName: row["Full Name"],
      customerPhone: row["Phone Number"],
      customerEmail: row["Email Address"],
      customerAddress: row["Full Address"],
      products: [
        { productName: row["Product Name"], quantity: Number(row["QTY"]) }
      ],
      deadWeight: Number(row["Dead Weight"]),
      length: Number(row["Length"]),
      breadth: Number(row["Breadth"]),
      height: Number(row["Height"]),
      volumetricWeight: calcVolumetricWeight(row["Length"], row["Breadth"], row["Height"]),
      amount: Number(row["Amount"]),
      paymentMode: row["Payment Mode"],
      vendorName: row["Vendor Name"],
      pickupAddress: row["Pickup Address"],
      status: "PENDING"
    }));

    // 1️⃣ Extract all orderIds from CSV
    const orderIds = ordersData.map(o => o.orderId);

    // 2️⃣ Check if any of them already exist in DB
    const existingOrders = await Order.find({ orderId: { $in: orderIds } });

    if (existingOrders.length > 0) {
      return res.status(409).json({
        error: `Duplicate orders found: ${existingOrders.map(o => o.orderId).join(", ")}`
      });
    }

    // 3️⃣ Insert only if no duplicates
    const savedOrders = await Order.insertMany(ordersData);
    res.status(201).json({
      message: `${savedOrders.length} orders saved successfully.`,
      savedOrders
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Get all orders
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update order by ID
export const updateOrder = async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "Order not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete order
export const deleteOrder = async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
