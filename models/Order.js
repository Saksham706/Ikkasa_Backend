import mongoose from "mongoose";

const orderProductSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  shopifyId: { type: String, unique: true, sparse: true },
  orderId: { type: String, required: true, unique: true },
  orderDate: { type: Date, default: Date.now },

  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String },
  customerAddress: { type: String, required: true },

  products: [orderProductSchema],

  deadWeight: { type: Number },
  length: { type: Number },
  breadth: { type: Number },
  height: { type: Number },
  volumetricWeight: { type: Number },

  amount: { type: Number, default: 0 },
  paymentMode: { type: String, default: "" },

  vendorName: { type: String },
  pickupAddress: { type: String },

  status: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
