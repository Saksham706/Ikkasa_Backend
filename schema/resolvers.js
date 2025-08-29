import Order from "../models/Order.js";
import { syncOrdersFromShopifyGraphQL } from "../utils/shopifySync.js";

export const resolvers = {
  Query: {
    orders: async (_, { page = 1, limit = 20 }) =>
      await Order.find().sort({ orderDate: -1 }).skip((page - 1) * limit).limit(limit),
    order: async (_, { id }) => await Order.findById(id),
    syncOrders: async () => {
      const orders = await syncOrdersFromShopifyGraphQL();

      const savedOrders = [];
      for (const orderData of orders) {
        const saved = await Order.findOneAndUpdate(
          { shopifyId: orderData.shopifyId },
          orderData,
          { upsert: true, new: true }
        );
        savedOrders.push(saved);
      }

      return savedOrders;
    },
  },
  Mutation: {
    createOrder: async (_, { input }) => {
      const order = await Order.create(input);
      return order;
    },
    updateOrder: async (_, { id, input }) => {
      return await Order.findByIdAndUpdate(id, input, { new: true });
    },
    deleteOrder: async (_, { id }) => {
      const deleted = await Order.findByIdAndDelete(id);
      return !!deleted;
    },
  },
};
