import axios from "axios";
import Order from "../models/Order.js";
import dotenv from "dotenv";

dotenv.config();

const SHOP = process.env.SHOPIFY_STORE_URL;
const API_VER = process.env.SHOPIFY_API_VERSION;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

/**
 * Robust handling for syncing orders from Shopify.
 */
export const syncOrders = async (req, res, next) => {
  try {
    let allOrders = [];
    let url = `${SHOP}/admin/api/${API_VER}/orders.json?status=any&limit=100&order=created_at desc`;
    let hasNextPage = true;

    // Paginate through all orders
    while (hasNextPage) {
      const response = await axios.get(url, {
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json",
        },
      });

      allOrders = [...allOrders, ...response.data.orders];

      // Pagination: look for 'next' rel in Link header
      const linkHeader = response.headers["link"];
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>; rel="next"/);
        url = match && match[1] ? match[1] : null;
        hasNextPage = !!url;
      } else {
        hasNextPage = false;
      }
    }

    const savedOrders = [];
    for (let sOrder of allOrders) {
      // Fallback logic for recipient's name
      const nameFromShipAddr =
        [sOrder.shipping_address?.first_name, sOrder.shipping_address?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() || (sOrder.shipping_address?.name || "").trim();

      const nameFromBillAddr =
        [sOrder.billing_address?.first_name, sOrder.billing_address?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() || (sOrder.billing_address?.name || "").trim();

      const nameFromCustomer =
        [sOrder.customer?.first_name, sOrder.customer?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();

      const customerName =
        nameFromShipAddr ||
        nameFromBillAddr ||
        nameFromCustomer ||
        sOrder.email ||
        "Unknown Customer";

      // Contact Email
      const customerEmail =
        sOrder.email ||
        sOrder.customer?.email ||
        sOrder.shipping_address?.email ||
        sOrder.billing_address?.email ||
        null;

      // Contact Phone
      const customerPhone =
        sOrder.shipping_address?.phone ||
        sOrder.billing_address?.phone ||
        sOrder.customer?.phone ||
        null;

      // Payment Method - Improved logic for REST API
      let paymentMethod = "";
      
      // First, try to get payment method from transactions (most reliable)
      if (sOrder.transactions && sOrder.transactions.length > 0) {
        const successfulTransaction = sOrder.transactions.find(t => t.status === 'success') || sOrder.transactions[0];
        paymentMethod = successfulTransaction.gateway ? successfulTransaction.gateway.toUpperCase() : "";
      }
      
      // Fallback to gateway field if available
      if (!paymentMethod && sOrder.gateway) {
        paymentMethod = sOrder.gateway.toUpperCase();
      }
      
      // Final fallback based on financial status
      if (!paymentMethod || paymentMethod === "UNKNOWN") {
        paymentMethod = sOrder.financial_status === "pending" ? "COD" : "PREPAID";
      }

      // Improved robust fallback for normalized customer
      const normalizedCustomer = sOrder.customer
        ? {
            id: sOrder.customer.id ? String(sOrder.customer.id) : null,
            firstName: sOrder.customer.first_name || "",
            lastName: sOrder.customer.last_name || "",
            email: sOrder.customer.email || "",
            phone: sOrder.customer.phone || "",
            // Corrected field names for REST API
            lastOrderId: sOrder.customer.last_order_id ? String(sOrder.customer.last_order_id) : null,
            lastOrderName: sOrder.customer.last_order_name || null,
            ordersCount: sOrder.customer.orders_count || 0,
            totalSpent: sOrder.customer.total_spent || "0.00",
            createdAt: sOrder.customer.created_at || null,
            updatedAt: sOrder.customer.updated_at || null,
            state: sOrder.customer.state || "disabled",
            note: sOrder.customer.note || "",
            verifiedEmail: sOrder.customer.verified_email || false,
            acceptsMarketing: sOrder.customer.accepts_marketing || false,
            tags: sOrder.customer.tags || "",
          }
        : {
            id: null,
            firstName:
              sOrder.shipping_address?.first_name ||
              sOrder.billing_address?.first_name ||
              "",
            lastName:
              sOrder.shipping_address?.last_name ||
              sOrder.billing_address?.last_name ||
              "",
            email:
              sOrder.email ||
              sOrder.shipping_address?.email ||
              sOrder.billing_address?.email ||
              "",
            phone:
              sOrder.shipping_address?.phone ||
              sOrder.billing_address?.phone ||
              "",
            lastOrderId: null,
            lastOrderName: null,
            ordersCount: 0,
            totalSpent: "0.00",
            createdAt: null,
            updatedAt: null,
            state: "disabled",
            note: "",
            verifiedEmail: false,
            acceptsMarketing: false,
            tags: "",
          };

      // Prepare address string - Added zip/postal_code field
      const customerAddress = [
        sOrder.shipping_address?.address1,
        sOrder.shipping_address?.address2,
        sOrder.shipping_address?.city,
        sOrder.shipping_address?.province,
        sOrder.shipping_address?.zip || sOrder.shipping_address?.postal_code, // Added zip field
        sOrder.shipping_address?.country,
      ]
        .filter(Boolean)
        .join(", ");

      // Enhanced billing address for completeness
      const billingAddress = [
        sOrder.billing_address?.address1,
        sOrder.billing_address?.address2,
        sOrder.billing_address?.city,
        sOrder.billing_address?.province,
        sOrder.billing_address?.zip || sOrder.billing_address?.postal_code,
        sOrder.billing_address?.country,
      ]
        .filter(Boolean)
        .join(", ");

      // Enhanced line items mapping
      const products = Array.isArray(sOrder.line_items)
        ? sOrder.line_items.map((item) => ({
            id: item.id ? String(item.id) : null,
            productId: item.product_id ? String(item.product_id) : null,
            variantId: item.variant_id ? String(item.variant_id) : null,
            productName: item.name || item.title || "",
            quantity: item.quantity || 0,
            price: parseFloat(item.price) || 0,
            totalDiscount: parseFloat(item.total_discount) || 0,
            sku: item.sku || "",
            vendor: item.vendor || "",
            fulfillmentStatus: item.fulfillment_status || null,
            fulfillableQuantity: item.fulfillable_quantity || 0,
            grams: item.grams || 0,
            requiresShipping: item.requires_shipping || false,
            taxable: item.taxable || false,
            properties: item.properties || [],
          }))
        : [];

      // Prepare order data for DB (camelCase)
      const orderData = {
        shopifyId: sOrder.id ? String(sOrder.id) : undefined,
        orderId: sOrder.order_number ? String(sOrder.order_number) : undefined,
        orderName: sOrder.name || "", // Added order name (e.g., "#1001")
        orderDate: sOrder.created_at ? new Date(sOrder.created_at) : new Date(),
        processedAt: sOrder.processed_at ? new Date(sOrder.processed_at) : null,
        updatedAt: sOrder.updated_at ? new Date(sOrder.updated_at) : null,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        billingAddress, // Added billing address
        products,
        amount: parseFloat(sOrder.total_price) || 0,
        subtotalPrice: parseFloat(sOrder.subtotal_price) || 0,
        totalTax: parseFloat(sOrder.total_tax) || 0,
        totalDiscounts: parseFloat(sOrder.total_discounts) || 0,
        totalShipping: parseFloat(sOrder.total_shipping_price_set?.shop_money?.amount) || 0,
        paymentMode: paymentMethod,
        financialStatus: sOrder.financial_status || "",
        fulfillmentStatus: sOrder.fulfillment_status || "",
        vendorName: sOrder.vendor || "",
        pickupAddress: sOrder.shipping_address?.address1 || "",
        status: sOrder.fulfillment_status || "",
        cancelled: sOrder.cancelled_at ? true : false,
        cancelledAt: sOrder.cancelled_at ? new Date(sOrder.cancelled_at) : null,
        cancelReason: sOrder.cancel_reason || null,
        tags: sOrder.tags || "",
        note: sOrder.note || "",
        currency: sOrder.currency || "INR",
        presentmentCurrency: sOrder.presentment_currency || "INR",
        sourceIdentifier: sOrder.source_identifier || null,
        sourceName: sOrder.source_name || "",
        sourceUrl: sOrder.source_url || null,
        deviceId: sOrder.device_id || null,
        browserIp: sOrder.browser_ip || null,
        landingSite: sOrder.landing_site || null,
        referringSite: sOrder.referring_site || null,
        customer: normalizedCustomer, // Enhanced customer object
        shippingLines: sOrder.shipping_lines || [],
        taxLines: sOrder.tax_lines || [],
        discountCodes: sOrder.discount_codes || [],
        discountApplications: sOrder.discount_applications || [],
        refunds: sOrder.refunds || [],
        transactions: sOrder.transactions || [],
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
    console.error('Error syncing orders:', err);
    next(err);
  }
};


// The rest of your controller functions remain as you wrote them (createOrder, getOrders, getOrderById, updateOrder, deleteOrder).

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
