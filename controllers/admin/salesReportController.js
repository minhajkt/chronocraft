const Order = require("../../models/orderModel");
const Product = require("../../models/productmodel");
const Coupon = require("../../models/couponModel");
const mongoose = require("mongoose");
const Category = require("../../models/categoryModel");
const Cart = require("../../models/cartModel");

const getCategoryDiscount = async (categories) => {
  const categoryIds = categories.map(
    (categoryId) => new mongoose.Types.ObjectId(categoryId)
  );
  const categoriesData = await Category.find({ _id: { $in: categoryIds } });

  return categoriesData.map((category) => category.offer.offerDiscount || 0);
};

const calculateDiscountedPrice = async (product, coupon) => {
  if (!product) {
    throw new Error("Product is null");
  }

  const actualPrice = product.price;
  let highestDiscount = 0;

  if (product.offer && product.offer.active) {
    highestDiscount = product.offer.offerDiscount;
  }

  const categoryDiscounts = await getCategoryDiscount(product.categories);
  const highestCategoryDiscount = Math.max(...categoryDiscounts);

  if (highestCategoryDiscount > highestDiscount) {
    highestDiscount = highestCategoryDiscount;
  }

  let discountedPrice = actualPrice - (actualPrice * highestDiscount) / 100;

  if (coupon && coupon.active) {
    if (coupon.discountType === "percentage") {
      discountedPrice -= (discountedPrice * coupon.discountValue) / 100;
    } else if (coupon.discountType === "amount") {
      discountedPrice -= coupon.discountValue;
    }
  }

  discountedPrice = Math.max(discountedPrice, 0);

  return {
    actualPrice,
    discountedPrice,
  };
};

const generateSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, reportType } = req.query;
    let matchStage = {
      status: { $nin: ["Cancelled", "Returned"] },
    };
    let endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDateTime),
      };
    } else {
      const today = new Date();

      if (reportType === "daily") {
        matchStage.createdAt = {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lte: new Date(today.setHours(23, 59, 59, 999)),
        };
      } else if (reportType === "weekly") {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        matchStage.createdAt = {
          $gte: startOfWeek,
          $lte: endOfWeek,
        };
      } else if (reportType === "monthly") {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );

        matchStage.createdAt = {
          $gte: startOfMonth,
          $lte: endOfMonth,
        };
      } else if (reportType === "yearly") {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        startOfYear.setHours(0, 0, 0, 0);

        const endOfYear = new Date(
          today.getFullYear(),
          11,
          31,
          23,
          59,
          59,
          999
        );

        matchStage.createdAt = {
          $gte: startOfYear,
          $lte: endOfYear,
        };
      }
    }

    const orders = await Order.find(matchStage)
      .populate("items.product")
      .populate("coupon")
      .populate("user", "name");

    let totalDiscounts = 0;
    const detailedOrders = [];
    const aggregatedData = {};

    const getPeriodKey = (date) => {
      const d = new Date(date);
      switch (reportType) {
        case "daily":
          return d.toISOString().split("T")[0];
        case "weekly":
          const startOfWeek = new Date(d.setDate(d.getDate() - d.getDay()));
          return startOfWeek.toISOString().split("T")[0];
        case "monthly":
          return `${d.getFullYear()}-${(d.getMonth() + 1)
            .toString()
            .padStart(2, "0")}`;
        case "yearly":
          return `${d.getFullYear()}`; //
        default:
          return d.toISOString().split("T")[0];
      }
    };

    for (const order of orders) {
      let orderTotalDiscounts = 0;

      for (const item of order.items) {
        const product = item.product;
        const coupon = order.coupon;

        const { actualPrice, discountedPrice } = await calculateDiscountedPrice(
          product,
          coupon
        );

        const itemDiscount = (actualPrice - discountedPrice) * item.quantity;
        orderTotalDiscounts += itemDiscount;

        detailedOrders.push({
          userName: order.user.name,
          productName: product.name,
          quantity: item.quantity,
          actualPrice: actualPrice,
          discountedPrice: discountedPrice,
          discount: actualPrice - discountedPrice,
          orderDate: order.createdAt,
        });
      }

      totalDiscounts += orderTotalDiscounts;

      const periodKey = getPeriodKey(order.createdAt);
      if (!aggregatedData[periodKey]) {
        aggregatedData[periodKey] = {
          totalSalesCount: 0,
          totalOrderAmount: 0,
          totalDiscounts: 0,
        };
      }

      aggregatedData[periodKey].totalSalesCount += 1;
      aggregatedData[periodKey].totalOrderAmount += order.totalPrice;
      aggregatedData[periodKey].totalDiscounts += orderTotalDiscounts;
    }

    const aggregatedResults = Object.keys(aggregatedData).map((period) => ({
      _id: period,
      ...aggregatedData[period],
    }));

    res.json({
      success: true,
      data: aggregatedResults,
      detailedOrders: detailedOrders,
    });
  } catch (error) {
    console.error("Error in generateSalesReport:", error);
    res.status(500).json({
      success: false,
      message: "Error generating sales report",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

module.exports = {
  generateSalesReport,
};
