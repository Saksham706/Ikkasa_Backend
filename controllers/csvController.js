import { parseCSV } from "../utils/csvParser.js";
import Order from "../models/Order.js";
import { calcVolumetricWeight } from "../utils/calcVolWeight.js";

export const uploadCSV = async (req, res, next) => {
  try {
    const rows = await parseCSV(req.file.path);

    const ordersData = rows.map(row => ({
      orderId: row["Order ID"],
      orderDate: new Date(row["Date"]),
      customerName: row["Full Name"],
      customerPhone: row["Phone Number"],
      customerEmail: row["Email Address"],
      customerAddress: row["Full Address"],
      products: [{ productName: row["Product Name"], quantity: Number(row["QTY"]) }],
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

    // Get all existing orderIds; only insert new ones
    const orderIds = ordersData.map(o => o.orderId);
    const existingOrders = await Order.find({ orderId: { $in: orderIds } }, "orderId");

    const existingSet = new Set(existingOrders.map(o => o.orderId));
    const nonDuplicateOrders = ordersData.filter(o => !existingSet.has(o.orderId));

    if (nonDuplicateOrders.length === 0) {
      return res.status(409).json({ error: "All orders in CSV already exist." });
    }

    const savedOrders = await Order.insertMany(nonDuplicateOrders);
    res.status(201).json({
      message: `${savedOrders.length} new orders saved successfully.`,
      savedOrders
    });
  } catch (err) {
    next(err);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Order.countDocuments();
    res.json({ total, page, limit, orders });
  } catch (err) {
    next(err);
  }
};

export const updateOrder = async (req, res, next) => {
  try {
    if (req.body.length && req.body.breadth && req.body.height) {
      req.body.volumetricWeight = calcVolumetricWeight(
        req.body.length, req.body.breadth, req.body.height
      );
    }
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedOrder) return res.status(404).json({ error: "Order not found" });
    res.json(updatedOrder);
  } catch (err) {
    next(err);
  }
};

export const deleteOrder = async (req, res, next) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    next(err);
  }
};
