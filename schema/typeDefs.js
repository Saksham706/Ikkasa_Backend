import { gql } from "graphql-tag";

export const typeDefs = gql`
  type OrderProduct {
    id: String
    productId: String
    variantId: String
    productName: String
    quantity: Int
    price: Float
    sku: String
    vendor: String
    fulfillmentStatus: String
  }

  type Order {
    id: ID!
    shopifyId: String
    orderId: String
    orderName: String
    orderDate: String
    processedAt: String
    updatedAt: String
    customerName: String
    customerPhone: String
    customerEmail: String
    customerAddress: String
    billingAddress: String
    products: [OrderProduct]
    deadWeight: Float
    length: Float
    breadth: Float
    height: Float
    volumetricWeight: Float
    amount: Float
    subtotalPrice: Float
    totalTax: Float
    totalDiscounts: Float
    totalShipping: Float
    paymentMode: String
    financialStatus: String
    fulfillmentStatus: String
    vendorName: String
    pickupAddress: String
    status: String
    cancelled: Boolean
    cancelledAt: String
    cancelReason: String
    tags: String
    note: String
    currency: String
    presentmentCurrency: String
    createdAt: String
  }

  input OrderProductInput {
    productName: String!
    quantity: Int!
    price: Float
    sku: String
  }

  input OrderInput {
    shopifyId: String
    orderId: String!
    orderName: String
    orderDate: String
    customerName: String!
    customerPhone: String
    customerEmail: String
    customerAddress: String
    billingAddress: String
    products: [OrderProductInput]
    amount: Float
    paymentMode: String
    status: String
  }

  type Query {
    orders(page: Int, limit: Int): [Order]
    order(id: ID!): Order
    syncOrders: [Order]
  }

  type Mutation {
    createOrder(input: OrderInput!): Order
    updateOrder(id: ID!, input: OrderInput!): Order
    deleteOrder(id: ID!): Boolean
  }
`;
