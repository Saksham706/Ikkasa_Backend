import axios from "axios";
import Order from "../models/Order.js";
import dotenv from "dotenv";

dotenv.config();

const SHOP = process.env.SHOPIFY_STORE_URL;
const API_VER = process.env.SHOPIFY_API_VERSION;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

/**
 * Sync orders from Shopify in batches.
 */
export const syncOrders = async (req, res, next) => {
  try {
    let allOrders = [];
    let url = `${SHOP}/admin/api/${API_VER}/orders.json?status=any&limit=100&order=created_at desc`;
    let hasNextPage = true;

    // Loop for Shopify paginated orders
    while (hasNextPage) {
      const response = await axios.get(url, {
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json",
        }
      });

      allOrders = [...allOrders, ...response.data.orders];

      // Shopify pagination - get 'next' link
      const linkHeader = response.headers["link"];
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>; rel="next"/);
        url = match && match[1] ? match[1] : null;
        hasNextPage = !!url;
      } else {
        hasNextPage = false;
      }
    }

    // Upsert orders one by one (for demo; batch upserts is better for very large batches)
    const savedOrders = [];
    for (let sOrder of allOrders) {
      // Build robust customer info
      const nameFromCustomer = [sOrder.customer?.first_name, sOrder.customer?.last_name]
        .filter(Boolean).join(" ").trim();
      const nameFromShipAddr = [sOrder.shipping_address?.first_name, sOrder.shipping_address?.last_name]
        .filter(Boolean).join(" ").trim() || (sOrder.shipping_address?.name || "").trim();
      const nameFromBillAddr = [sOrder.billing_address?.first_name, sOrder.billing_address?.last_name]
        .filter(Boolean).join(" ").trim() || (sOrder.billing_address?.name || "").trim();

      const customerName = nameFromCustomer || nameFromShipAddr || nameFromBillAddr || sOrder.email || "Unknown Customer";
      const customerEmail = sOrder.customer?.email || sOrder.email || null;
      const customerPhone =
        sOrder.customer?.phone || sOrder.shipping_address?.phone || sOrder.billing_address?.phone || null;

      // Payment method handling
      let paymentMethod = sOrder.gateway ? sOrder.gateway.toUpperCase() : "";
      if (!paymentMethod || paymentMethod === "UNKNOWN") {
        paymentMethod = sOrder.financial_status === "pending" ? "COD" : "PREPAID";
      }

      // Prepare order data for DB
      const orderData = {
        shopifyId: sOrder.id ? String(sOrder.id) : undefined,
        orderId: sOrder.order_number ? String(sOrder.order_number) : undefined,
        orderDate: sOrder.created_at ? new Date(sOrder.created_at) : new Date(),
        customerName,
        customerPhone,
        customerEmail,
        customerAddress: [
          sOrder.shipping_address?.address1,
          sOrder.shipping_address?.address2,
          sOrder.shipping_address?.city,
          sOrder.shipping_address?.province,
          sOrder.shipping_address?.country,
        ].filter(Boolean).join(", "),
        products: Array.isArray(sOrder.line_items)
          ? sOrder.line_items.map((item) => ({
              productName: item.name,
              quantity: item.quantity,
            }))
          : [],
        amount: parseFloat(sOrder.total_price) || 0,
        paymentMode: paymentMethod,
        vendorName: sOrder.vendor || "",
        pickupAddress: sOrder.shipping_address?.address1 || "",
        status: "",
      };

      // Upsert (update or insert) to avoid duplicates
      const saved = await Order.findOneAndUpdate(
        { shopifyId: orderData.shopifyId },
        orderData,
        { upsert: true, new: true }
      );
      savedOrders.push(saved);
    }

    res.json({
      success: true,
      count: savedOrders.length,
      data: savedOrders,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create an order manually
 */
export const createOrder = async (req, res, next) => {
  try {
    if (req.body.orderDate) {
      req.body.orderDate = new Date(req.body.orderDate);
    }
    const newOrder = await Order.create(req.body);
    res.status(201).json({ success: true, data: newOrder });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all orders with pagination
 */
export const getOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);

    const orders = await Order.find()
      .sort({ orderDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Order.countDocuments();
    res.json({ success: true, total, page, limit, data: orders });
  } catch (err) {
    next(err);
  }
};

/**
 * Get order by ID
 */
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * Update order by ID
 */
export const updateOrder = async (req, res, next) => {
  try {
    if (req.body.orderDate) {
      req.body.orderDate = new Date(req.body.orderDate);
    }
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedOrder) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    res.json({ success: true, data: updatedOrder });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete order by ID
 */
export const deleteOrder = async (req, res, next) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    next(err);
  }
};