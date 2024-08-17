const mongoose = require("mongoose");
const User = require("../../models/usermodel");
const Coupon = require("../../models/couponModel");
const Product = require("../../models/productmodel");
const Category = require("../../models/categoryModel");
const Address = require("../../models/addressModel");
const Order = require("../../models/orderModel");
const Cart = require("../../models/cartModel");

const getCategoryDiscount = async (categories) => {
  const categoryIds = categories.map(
    (categoryId) => new mongoose.Types.ObjectId(categoryId)
  );
  const categoriesData = await Category.find({ _id: { $in: categoryIds } });

  return categoriesData.map((category) => category.offer.offerDiscount || 0);
};

const calculateDiscountedPrice = async (product) => {
  const actualPrice = product.price;
  let highestDiscount = 0;

  if (product.offer.active) {
    highestDiscount = product.offer.offerDiscount;
  }

  const categoryDiscounts = await getCategoryDiscount(product.categories);
  const highestCategoryDiscount = Math.max(...categoryDiscounts);

  if (highestCategoryDiscount > highestDiscount) {
    highestDiscount = highestCategoryDiscount;
  }

  const discountedPrice = actualPrice - (actualPrice * highestDiscount) / 100;

  return {
    actualPrice,
    discountedPrice: discountedPrice > 0 ? discountedPrice : actualPrice,
  };
};

const orderDetails = async (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let userIds = [];
    if (searchQuery) {
      const users = await User.find({
        name: { $regex: searchQuery, $options: "i" },
      }).select("_id");

      userIds = users.map((user) => user._id);
    }

    let productIds = [];
    if (searchQuery) {
      const products = await Product.find({
        name: { $regex: searchQuery, $options: "i" },
      }).select("_id");

      productIds = products.map((product) => product._id);
    }

    const query = {
      $or: [
        { user: { $in: userIds } },
        { "items.product": { $in: productIds } },
        { paymentMethod: { $regex: searchQuery, $options: "i" } },
        { status: { $regex: searchQuery, $options: "i" } },
      ],
    };

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name")
      .populate("items.product")
      .populate("coupon")
      .lean();

    orders.forEach((order) => {
      let discount = 0;
      let finalPrice = order.totalPrice;

      if (order.coupon) {
        const coupon = order.coupon;
        if (coupon.discountType === "percentage") {
          discount = Math.round(
            (coupon.discountValue / 100) * order.totalPrice
          );
        } else if (coupon.discountType === "amount") {
          discount = Math.round(coupon.discountValue);
        }
        finalPrice = order.totalPrice - discount;
      }

      order.discount = discount;
      order.finalPrice = finalPrice;
    });

    res.render("admin/order-details", {
      orders,
      searchQuery,
      currentPage: page,
      totalPages,
      totalOrders,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const singleOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("user", "name email mobile")
      .populate("items.product")
      .populate("coupon")
      .lean();
    if (!order) {
      return res.redirect("/admin/orders");
    }

    let totalPrice = 0;
    let couponDiscount = 0;
    let finalPrice = 0;

    const discountedItems = await Promise.all(
      order.items.map(async (item) => {
        const product = await Product.findById(item.product._id);
        const { actualPrice, discountedPrice } = await calculateDiscountedPrice(
          product
        );

        totalPrice += discountedPrice * item.quantity;

        return {
          ...item,
          product: {
            ...item.product,
            price: discountedPrice,
          },
        };
      })
    );

    order.items = discountedItems;
    order.totalPrice = totalPrice;

    if (order.coupon) {
      const coupon = await Coupon.findById(order.coupon._id);
      if (coupon) {
        if (coupon.discountType === "percentage") {
          couponDiscount = Math.round(
            (coupon.discountValue / 100) * totalPrice
          );
        } else if (coupon.discountType === "amount") {
          couponDiscount = Math.round(coupon.discountValue);
        }
        finalPrice = totalPrice - couponDiscount;
      }
    } else {
      finalPrice = totalPrice;
    }

    order.discount = couponDiscount;
    order.priceAfterDiscount = finalPrice;

    res.render("admin/single-order-details", { order });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const changeOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const newStatus = req.body.status;

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: newStatus },
      { new: true }
    );
    if (!updatedOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    req.flash("success", "Order status updated successfully.");
    return res
      .status(200)
      .json({ success: true, message: "Order status updated successfully." });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  orderDetails,
  changeOrderStatus,
  singleOrderDetails,
};
