import mongoose from "mongoose";

// Sub-schema for products
const orderProductSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity: { type: Number, required: true }
});

// Main Order schema
const orderSchema = new mongoose.Schema({
  shopifyId: { type: String, required: true, unique: true },
  orderId: { type: String, required: true, unique: true }, // ✅ Will now store last 4 digits
  orderDate: { type: Date, default: Date.now },

  // Customer
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String },
  customerAddress: { type: String, required: true },

  // Products
  products: [orderProductSchema],

  // Package
  deadWeight: { type: Number },
  length: { type: Number },
  breadth: { type: Number },
  height: { type: Number },
  volumetricWeight: { type: Number },

  // Payment
  amount: { type: Number, default: 0 },
  paymentMode: { type: String, default: "" }, // ✅ Default empty instead of UNKNOWN

  // Pickup
  vendorName: { type: String },
  pickupAddress: { type: String },

  status: { type: String, default: "" } // ✅ Default empty instead of PENDING
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
