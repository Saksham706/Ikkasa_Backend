import axios from "axios";
import Order from "../models/Order.js";
import dotenv from "dotenv";
dotenv.config();

const SHOPIFY_API_URL = `https://${process.env.SHOPIFY_STORE_URL.replace(/^https?:\/\//, "")}/admin/api/${process.env.SHOPIFY_API_VERSION}/graphql.json`;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

const ORDERS_QUERY = (afterCursor = null) => `
query {
  orders(first: 100${afterCursor ? `, after: "${afterCursor}"` : ""}) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        name
        createdAt
        processedAt
        updatedAt
        email
        phone
        displayFinancialStatus
        displayFulfillmentStatus
        paymentGatewayNames
        cancelledAt
        cancelReason
        tags
        note
        currencyCode
        presentmentCurrencyCode
        customer {
          id
          firstName
          lastName
          displayName
          email
          phone
          numberOfOrders
          amountSpent {
            amount
            currencyCode
          }
          createdAt
          updatedAt
          state
          verifiedEmail
          tags
          lastOrder {
            id
            name
          }
        }
        shippingAddress {
          firstName
          lastName
          name
          address1
          address2
          city
          province
          zip
          country
          phone
          email
        }
        billingAddress {
          firstName
          lastName
          name
          address1
          address2
          city
          province
          zip
          country
          phone
          email
        }
        lineItems(first: 100) {
          edges {
            node {
              id
              name
              title
              product {
                id
                title
              }
              variant {
                id
                title
              }
              quantity
              originalUnitPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              originalTotalSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              sku
              vendor
              unfulfilledQuantity
              requiresShipping
              taxable
            }
          }
        }
        currentTotalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        currentSubtotalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        currentTotalTaxSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        currentTotalDiscountsSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        currentShippingPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        transactions(first: 10) {
          gateway
          status
          kind
          amountSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          createdAt
          processedAt
        }
        discountApplications(first: 10) {
          edges {
            node {
              ... on DiscountCodeApplication {
                code
                value {
                  ... on MoneyV2 {
                    amount
                    currencyCode
                  }
                  ... on PricingPercentageValue {
                    percentage
                  }
                }
              }
              ... on AutomaticDiscountApplication {
                title
                value {
                  ... on MoneyV2 {
                    amount
                    currencyCode
                  }
                  ... on PricingPercentageValue {
                    percentage
                  }
                }
              }
            }
          }
        }
        currentTaxLines {
          title
          rate
          priceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
        fulfillments(first: 10) {
          id
          status
          createdAt
          trackingInfo(first: 5) {
            number
            company
            url
          }
        }
        refunds(first: 10) {
          id
          createdAt
          totalRefundedSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
}
`;


export const syncOrdersFromShopifyGraphQL = async () => {
  try {
    let allOrders = [];
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage) {
      const response = await axios.post(
        SHOPIFY_API_URL,
        { query: ORDERS_QUERY(endCursor) },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": TOKEN,
          },
        }
      );

      if (response.data.errors) {
        throw new Error(JSON.stringify(response.data.errors));
      }

      const ordersData = response.data.data.orders;

      const ordersBatch = ordersData.edges.map(({ node: sOrder }) => {
        const customerName = sOrder.customer
          ? [sOrder.customer.firstName, sOrder.customer.lastName].filter(Boolean).join(" ")
          : "";

        // First transaction's gateway
        const paymentGateway =
          sOrder.transactions.length > 0
            ? sOrder.transactions[0].gateway
            : "";

        const products = sOrder.lineItems.edges.map(({ node: item }) => ({
          productName: item.product?.title || "",
          quantity: item.quantity,
          price: item.originalUnitPrice ? parseFloat(item.originalUnitPrice) : 0,
          sku: item.sku || "",
          vendor: item.vendor || "",
          fulfillmentStatus: item.fulfillmentStatus || "",
        }));

        return {
          shopifyId: sOrder.id,
          orderId: sOrder.name,
          orderName: sOrder.name,
          orderDate: new Date(sOrder.createdAt),
          processedAt: sOrder.processedAt ? new Date(sOrder.processedAt) : null,
          updatedAt: sOrder.updatedAt ? new Date(sOrder.updatedAt) : null,
          customerName: customerName || "",
          customerPhone: sOrder.customer?.phone || "",
          customerEmail: sOrder.customer?.email || "",
          customerAddress: sOrder.shippingAddress?.address1 || "",
          billingAddress: sOrder.billingAddress?.address1 || "",
          products,
          amount: sOrder.totalPrice ? parseFloat(sOrder.totalPrice) : 0,
          paymentMode: paymentGateway ? paymentGateway.toUpperCase() : "UNKNOWN",
          cancelled: Boolean(sOrder.cancelledAt),
          cancelledAt: sOrder.cancelledAt ? new Date(sOrder.cancelledAt) : null,
          cancelReason: sOrder.cancelReason || "",
          tags: sOrder.tags || "",
          note: sOrder.note || "",
          currency: sOrder.currencyCode || "INR",
          presentmentCurrency: sOrder.presentmentCurrencyCode || "INR",
        };
      });

      allOrders = allOrders.concat(ordersBatch);

      hasNextPage = ordersData.pageInfo.hasNextPage;
      endCursor = ordersData.pageInfo.endCursor;
    }

    const savedOrders = [];
    for (const orderData of allOrders) {
      const saved = await Order.findOneAndUpdate(
        { shopifyId: orderData.shopifyId },
        orderData,
        { upsert: true, new: true }
      );
      savedOrders.push(saved);
    }

    return savedOrders;
  } catch (err) {
    console.error("Error syncing orders:", err);
    throw new Error("Failed to sync Shopify orders");
  }
};
