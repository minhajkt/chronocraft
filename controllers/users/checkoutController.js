const User = require("../../models/usermodel");
const Address = require("../../models/addressModel");
const Product = require("../../models/productmodel");
const Cart = require("../../models/cartModel");
const Order = require("../../models/orderModel");
const Coupon = require("../../models/couponModel");
const Category = require("../../models/categoryModel");
const mongoose = require("mongoose");

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

const getAddressPage = async (req, res) => {
  try {
    const userId = req.session.user_id;

    if (!userId) {
      console.log("User ID not found in session.");
      return res.redirect("/login");
    }

    const cart = await Cart.findOne({ userId }).populate("product.productId");
    if (!cart) {
      console.log("Cart not found");
      return res.render("users/cart", { cart: null });
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
        console.log("No valid coupon found for cart.");
      }
    } else {
      console.log("No coupon applied in cart.");
    }

    const user = await User.findById(userId).populate("addresses");
    if (!user) {
      console.log("User not found.");
      return res.redirect("/login");
    }

    res.render("users/checkout-address", {
      user,
      cart,
      discount: couponDiscount,
      finalPrice,
    });
  } catch (error) {
    console.log("Error in getAddressPage:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const submitAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { addressId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not Found" });
    }

    const selectedAddress = await user.addresses.find(
      (address) => address.toString() === addressId
    );
    if (!selectedAddress) {
      return res
        .status(404)
        .json({ success: false, message: "Address Not Found" });
    }

    req.session.selectedAddress = addressId;
    res
      .status(200)
      .json({ success: true, message: "Address selected Successfully" });
  } catch (error) {
    console.log(error.message);
  }
};

const getPaymentPage = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const selectedAddress = req.session.selectedAddress;

    if (!userId || !selectedAddress) {
      res.redirect("/checkout-address");
    }

    const user = await User.findById(userId).populate("addresses");
    const address = await user.addresses.find(
      (address) => address._id.toString() === selectedAddress
    );

    const cart = await Cart.findOne({ userId }).populate("product.productId");
    if (!cart) {
      return res.redirect("/cart");
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
        console.log("No valid coupon found for cart.");
      }
    } else {
      console.log("No coupon applied in cart.");
    }

    res.render("users/payment", {
      user,
      address,
      cart,
      discount: couponDiscount,
      finalPrice,
    });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  getAddressPage,
  submitAddress,
  getPaymentPage,
};
