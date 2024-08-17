const User = require("../../models/usermodel");
const Address = require("../../models/addressModel");
const Product = require("../../models/productmodel");
const Cart = require("../../models/cartModel");
const Order = require("../../models/orderModel");
const productmodel = require("../../models/productmodel");
const _ = require("lodash");
const mongoose = require("mongoose");
const Coupon = require("../../models/couponModel");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Category = require("../../models/categoryModel");
const { log } = require("console");

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const getCategoryDiscount = async (categories) => {
  const categoryIds = categories.map(
    (categoryId) => new mongoose.Types.ObjectId(categoryId)
  );
  const categoriesData = await Category.find({ _id: { $in: categoryIds } });

  return categoriesData.map((category) => category.offer.offerDiscount || 0);
};

const calculateDiscountedPrice = async (product) => {
  if (!product) {
    throw new Error("Product is null");
  }

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

const razorpay = new Razorpay({
  key_id: "rzp_test_VApTinR8991MNk",
  key_secret: "Yi2MX0Q3aLYPSlswSU5CMpfP",
});

const confirmOrder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { payment, address } = req.body;

    if (!payment || !address) {
      res
        .status(400)
        .json({
          success: false,
          message: "All address fields and payment method are required",
        });
    }

    const cart = await Cart.findOne({ userId }).populate("product.productId");
    if (!cart) {
      res
        .status(400)
        .json({ success: false, message: "Cart not found or is empty" });
    }

    for (const item of cart.product) {
      const productId = item.productId._id;
      const product = await Product.findById(productId);

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${product.name}. Only ${product.quantity} left in stock.`,
        });
      }
    }

    const order = new Order({
      user: userId,
      items: cart.product.map((item) => ({
        product: item.productId._id,
        quantity: item.quantity,
      })),
      totalPrice: cart.totalPrice,
      coupon: cart.coupon,
      paymentMethod: payment,
      address: {
        street: address.street,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      },
    });

    await order.save();

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (payment === "wallet") {
      let totalPrice = 0;
      let discountedProducts = await Promise.all(
        cart.product.map(async (item) => {
          const product = await Product.findById(item.productId);
          const { actualPrice, discountedPrice } =
            await calculateDiscountedPrice(product);

          totalPrice += discountedPrice * item.quantity;

          return {
            ...item.toObject(),
            productId: {
              ...item.productId.toObject(),
              price: discountedPrice,
            },
          };
        })
      );

      cart.product = discountedProducts;
      cart.totalPrice = totalPrice;

      let couponDiscount = 0;
      let finalPrice = totalPrice;

      if (cart.coupon) {
        const coupon = await Coupon.findById(cart.coupon);

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
      }
      user.wallet -= finalPrice;
      await user.save();
      req.flash(
        "success",
        "Order Placed successfully using your wallet balance"
      );
    }

    for (const item of cart.product) {
      const productId = item.productId._id;
      const quantityOrdered = item.quantity;

      await Product.findByIdAndUpdate(
        productId,
        { $inc: { quantity: -quantityOrdered } },
        { new: true }
      );
    }

    await Cart.findOneAndDelete({ userId });

    const placedOrder = await Order.findById(order._id).populate(
      "items.product"
    );

    res.render("users/confirm-order", {
      order: placedOrder,
      success: true,
      message: "Order Placed Successfully",
    });
  } catch (error) {
    console.log(error.message);
  }
};

const loadOrders = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const orders = await Order.find({ user: userId })
      .populate("items.product")
      .populate("coupon")
      .lean();

    for (const order of orders) {
      let totalPrice = 0;

      let discountedProducts = await Promise.all(
        order.items.map(async (item) => {
          const product = await Product.findById(item.product);
          const { actualPrice, discountedPrice } =
            await calculateDiscountedPrice(product);

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

      order.items = discountedProducts;
      order.totalPrice = totalPrice;

      let couponDiscount = 0;
      let finalPrice = totalPrice;

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
        } else {
          console.log("No valid coupon found for order.");
        }
      }

      order.discount = couponDiscount;
      order.priceAfterDiscount = finalPrice;
    }

    const sortedOrders = _.orderBy(orders, ["createdAt"], ["desc"]);
    console.log(
      "Fetched orders:",
      JSON.stringify(
        orders.map((order) => ({
          _id: order._id,
          totalPrice: order.totalPrice,
          discount: order.discount,
          priceAfterDiscount: order.priceAfterDiscount,
        })),
        null,
        2
      )
    );

    res.render("users/view-orders", { orders: sortedOrders });
  } catch (error) {
    console.error(error);
  }
};

const viewOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const orderId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json("User not Found");
    }

    const order = await Order.findById(orderId)
      .populate("items.product")
      .populate("coupon")
      .lean();

    if (!order) {
      return res.status(404).send("Order not found");
    }

    let totalPrice = 0;

    const discountedProducts = await Promise.all(
      order.items.map(async (item) => {
        const product = await Product.findById(item.product).lean();
        if (!product) {
          console.warn(`Product not found: ${item.product}`);
          return item;
        }

        const { actualPrice, discountedPrice } = await calculateDiscountedPrice(
          product
        );
        totalPrice += discountedPrice * item.quantity;

        return {
          ...item,
          product: {
            ...product,
            price: discountedPrice,
          },
        };
      })
    );

    order.items = discountedProducts;
    order.totalPrice = totalPrice;

    let couponDiscount = 0;
    let finalPrice = totalPrice;

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
      } else {
        console.warn(`Coupon not found: ${order.coupon._id}`);
      }
    }

    order.discount = couponDiscount;
    order.priceAfterDiscount = finalPrice;

    res.render("users/view-order-details", { order, user });
  } catch (error) {
    console.log(error.message);
  }
};

const cancelOrders = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.session.user_id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.log("Invalid Order ID:", orderId);
      return res
        .status(400)
        .json({ success: false, message: "Invalid Order ID" });
    }

    const order = await Order.findById(orderId)
      .populate("items.product")
      .populate("coupon");

    if (!order) {
      console.log("Order not found:", orderId);
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.paymentStatus != "Pending") {
      for (const item of order.items) {
        const productId = item.product._id;
        const quantityOrdered = item.quantity;

        const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          { $inc: { quantity: quantityOrdered } },
          { new: true }
        );

        if (!updatedProduct) {
          console.log("Failed to update product:", productId);
        } else {
          console.log("Updated product:", updatedProduct);
        }
      }

      order.status = "Cancelled";
      await order.save();

      req.flash("success", "Your order has been cancelled");
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (order.paymentMethod === "online" || order.paymentMethod === "wallet") {
      let totalPrice = 0;

      let discountedProducts = await Promise.all(
        order.items.map(async (item) => {
          const product = await Product.findById(item.product);
          const { actualPrice, discountedPrice } =
            await calculateDiscountedPrice(product);

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

      order.items = discountedProducts;
      order.totalPrice = totalPrice;

      let couponDiscount = 0;
      let finalPrice = totalPrice;

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
        } else {
          console.log("No valid coupon found for order.");
        }
      }

      order.discount = couponDiscount;
      order.priceAfterDiscount = finalPrice;

      if (order.paymentStatus != "Pending") {
        user.wallet += order.priceAfterDiscount;
        await user.save();
        console.log(
          "Your wallet has been credited with the amount of",
          order.priceAfterDiscount
        );
        req.flash(
          "success",
          "Your order has been cancelled and the purchase amount has been credited to your wallet."
        );
      } else if (order.paymentStatus === "Pending") {
        req.flash("success", "Your order has been cancelled.");
      }
    } else {
      console.log("No refund needed for COD orders.");
    }

    res.redirect("/view-orders");
  } catch (error) {
    console.log("Error during order cancellation:", error.message);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const returnOrder = async (req, res) => {
  const { orderId } = req.body;
  const userId = req.session.user_id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    console.log("Invalid Order ID:", orderId);
    return res
      .status(400)
      .json({ success: false, message: "Invalid Order ID" });
  }

  const order = await Order.findById(orderId)
    .populate("items.product")
    .populate("coupon");

  if (!order) {
    console.log("Order not found:", orderId);
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  for (const item of order.items) {
    const productId = item.product._id;
    const quantityOrdered = item.quantity;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { quantity: quantityOrdered } },
      { new: true }
    );

    if (!updatedProduct) {
      console.log("Failed to update product:", productId);
    } else {
      console.log("Updated product:", updatedProduct);
    }
  }

  order.status = "Returned";
  await order.save();

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  let totalPrice = 0;

  let discountedProducts = await Promise.all(
    order.items.map(async (item) => {
      const product = await Product.findById(item.product);
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

  order.items = discountedProducts;
  order.totalPrice = totalPrice;

  let couponDiscount = 0;
  let finalPrice = totalPrice;

  if (order.coupon) {
    const coupon = await Coupon.findById(order.coupon._id);
    if (coupon.discountType === "percentage") {
      couponDiscount = Math.round((coupon.discountValue / 100) * totalPrice);
    } else if (coupon.discountType === "amount") {
      couponDiscount = Math.round(coupon.discountValue);
    }
    finalPrice = totalPrice - couponDiscount;
  }

  order.discount = couponDiscount;
  order.priceAfterDiscount = finalPrice;

  user.wallet += order.priceAfterDiscount;
  await user.save();
  req.flash(
    "success",
    "Your order has been returned and the purchase amount has been credited to your wallet"
  );
  res.redirect("/view-orders");
};

const createRazorpayOrder = async (req, res) => {
  try {
    const { address } = req.body;
    const userId = req.session.user_id;

    const cart = await Cart.findOne({ userId }).populate("product.productId");
    if (!cart) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cart not found or is emptyyyyyyyyyyyyy",
        });
    }

    for (const item of cart.product) {
      const productId = item.productId._id;
      const product = await Product.findById(productId);

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${product.name}. Only ${product.quantity} left in stock.`,
        });
      }
    }

    let totalPrice = 0;
    let discountedProducts = await Promise.all(
      cart.product.map(async (item) => {
        const product = await Product.findById(item.productId);
        const { actualPrice, discountedPrice } = await calculateDiscountedPrice(
          product
        );

        totalPrice += discountedPrice * item.quantity;

        return {
          ...item.toObject(),
          productId: {
            ...item.productId.toObject(),
            price: discountedPrice,
          },
        };
      })
    );

    cart.product = discountedProducts;
    cart.totalPrice = totalPrice;

    let couponDiscount = 0;
    let finalPrice = totalPrice;

    if (cart.coupon) {
      const coupon = await Coupon.findById(cart.coupon);
      if (coupon) {
        if (coupon.discountType === "percentage") {
          couponDiscount = Math.round(
            (coupon.discountValue / 100) * totalPrice
          );
        } else if (coupon.discountType === "amount") {
          couponDiscount = Math.round(coupon.discountValue);
        }
        finalPrice = totalPrice - couponDiscount;
      } else {
        console.log("No valid coupon found for order.");
      }
    }

    const orderOptions = {
      amount: finalPrice * 100,
      currency: "INR",
      receipt: `order_rcptid_${new Date().getTime()}`,
      payment_capture: "1",
    };

    const razorpayOrder = await razorpay.orders.create(orderOptions);

    res.json({
      success: true,
      key_id: "rzp_test_VApTinR8991MNk",
      amount: orderOptions.amount,
      currency: orderOptions.currency,
      order_id: razorpayOrder.id,
      address: address,
      payment: "online",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const confirmOrderOnline = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const {
      address,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!address || !razorpay_order_id) {
      return res
        .status(400)
        .json({
          success: false,
          message: "All address fields and payment details are required",
        });
    }

    let order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
      const cart = await Cart.findOne({ userId }).populate("product.productId");
      if (!cart) {
        return res
          .status(400)
          .json({ success: false, message: "Cart not found or is empty" });
      }

      order = new Order({
        user: userId,
        items: cart.product.map((item) => ({
          product: item.productId._id,
          quantity: item.quantity,
        })),
        totalPrice: cart.totalPrice,
        coupon: cart.coupon,
        paymentMethod: "online",
        address: {
          street: address.street,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        },
        paymentStatus: "Pending",
        razorpayOrderId: razorpay_order_id,
      });
    }

    let isPaymentSuccessful = false;
    if (razorpay_payment_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac("sha256", "Yi2MX0Q3aLYPSlswSU5CMpfP")
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      isPaymentSuccessful = generatedSignature === razorpay_signature;
    }

    order.paymentStatus = isPaymentSuccessful ? "Completed" : "Pending";
    order.paymentDetails = {
      razorpay_payment_id,
      razorpay_signature,
    };

    await order.save();
    await Cart.findOneAndDelete({ userId });

    if (isPaymentSuccessful) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: -item.quantity } },
          { new: true }
        );
      }
    }

    res.json({
      success: true,
      order,
      paymentStatus: isPaymentSuccessful ? "Completed" : "Pending",
      message: "Order placed successfully",
    });
  } catch (error) {
    console.error("Error confirming order:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const retryPayment = async (req, res) => {
  try {
    const { orderId, amount, address } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const razorpay = new Razorpay({
      key_id: "rzp_test_VApTinR8991MNk",
      key_secret: "Yi2MX0Q3aLYPSlswSU5CMpfP",
    });

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `order_rcptid_${new Date().getTime()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.json({
      success: true,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      address: address,
    });
  } catch (error) {
    console.error("Retry Payment Error:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const confirmRetryPayment = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const {
      address,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!address || !razorpay_order_id) {
      return res
        .status(400)
        .json({
          success: false,
          message: "All address fields and payment details are required",
        });
    }

    let order = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
    }).populate("items.product");
    if (!order) {
      return res
        .status(400)
        .json({ success: false, message: "Order not found" });
    }

    let isPaymentSuccessful = false;
    if (razorpay_payment_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac("sha256", "Yi2MX0Q3aLYPSlswSU5CMpfP")
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      isPaymentSuccessful = generatedSignature === razorpay_signature;
    }

    order.paymentStatus = isPaymentSuccessful ? "Completed" : "Failed";
    order.paymentDetails = {
      razorpay_payment_id,
      razorpay_signature,
    };
    await order.save();

    if (isPaymentSuccessful) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: -item.quantity } },
          { new: true }
        );
      }

      await Cart.findOneAndDelete({ userId });
    }

    res.json({
      success: true,
      order,
      paymentStatus: isPaymentSuccessful ? "Completed" : "Pending",
      message: "Retry payment processed successfully",
    });
  } catch (error) {
    console.error("Error confirming retry payment:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getWallet = async (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found in database" });
    }

    const orders = await Order.find({ user: userId })
      .populate("items.product")
      .populate("coupon")
      .lean();

    const transactions = [];

    for (const order of orders) {
      let totalPrice = 0;

      const discountedProducts = await Promise.all(
        order.items.map(async (item) => {
          const product = await Product.findById(item.product);
          const { actualPrice, discountedPrice } =
            await calculateDiscountedPrice(product);

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

      order.items = discountedProducts;
      order.totalPrice = totalPrice;

      let couponDiscount = 0;
      let finalPrice = totalPrice;

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
        } else {
          console.log("No valid coupon found for order.");
        }
      }

      order.discount = couponDiscount;
      order.priceAfterDiscount = finalPrice;

      if (order.paymentMethod === "wallet") {
        transactions.push({
          date: new Date(order.createdAt).toLocaleDateString(),
          amount: order.priceAfterDiscount,
          type: "Debit",
        });
      }

      if (order.status === "Cancelled" || order.status === "Returned") {
        transactions.push({
          date: new Date(order.createdAt).toLocaleDateString(),
          amount: order.priceAfterDiscount,
          type: "Credit",
        });
      }
    }

    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.render("users/wallet", { user, transactions });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  confirmOrder,
  loadOrders,
  viewOrderDetails,
  cancelOrders,
  returnOrder,
  getWallet,
  confirmOrderOnline,
  createRazorpayOrder,
  retryPayment,
  confirmRetryPayment,
};
