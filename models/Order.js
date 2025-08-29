import mongoose from "mongoose";

const orderProductSchema = new mongoose.Schema({
  id: String,
  productId: String,
  variantId: String,
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: Number,
  sku: String,
  vendor: String,
  fulfillmentStatus: String,
});

const orderSchema = new mongoose.Schema({
  shopifyId: { type: String, unique: true, sparse: true },
  orderId: { type: String, required: true, unique: true },
  orderName: String,
  orderDate: { type: Date, default: Date.now },
  processedAt: Date,
  updatedAt: Date,

  customerName: String,
  customerPhone: String,
  customerEmail: String,
  customerAddress: String,
  billingAddress: String,

  products: [orderProductSchema],

  deadWeight: Number,
  length: Number,
  breadth: Number,
  height: Number,
  volumetricWeight: Number,

  amount: { type: Number, default: 0 },
  subtotalPrice: Number,
  totalTax: Number,
  totalDiscounts: Number,
  totalShipping: Number,

  paymentMode: String,
  financialStatus: String,
  fulfillmentStatus: String,

  vendorName: String,
  pickupAddress: String,
  status: String,

  cancelled: Boolean,
  cancelledAt: Date,
  cancelReason: String,

  tags: String,
  note: String,
  currency: { type: String, default: "INR" },
  presentmentCurrency: { type: String, default: "INR" },

  customer: mongoose.Schema.Types.Mixed,
  shippingLines: Array,
  taxLines: Array,
  discountCodes: Array,
  discountApplications: Array,
  refunds: Array,
  transactions: Array,
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
