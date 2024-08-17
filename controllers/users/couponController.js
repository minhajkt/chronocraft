const Coupon = require("../../models/couponModel");
const Cart = require("../../models/cartModel");
const Product = require("../../models/productmodel");
const mongoose = require("mongoose");
const Category = require("../../models/categoryModel");

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

const applyCoupon = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { code } = req.body;
    const coupon = await Coupon.findOne({ code, active: true });

    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Inactive or Invalid Coupon Code" });
    }

    if (coupon.expirationDate < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon has expired" });
    }

    if (coupon.couponCount >= coupon.usageLimit) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon Usage limit exceeded" });
    }

    const cart = await Cart.findOne({ userId }).populate("product.productId");

    if (!cart) {
      return res
        .status(400)
        .json({ success: false, message: "Cart not found" });
    }

    let totalPrice = 0;
    await Promise.all(
      cart.product.map(async (item) => {
        const product = await Product.findById(item.productId);
        const { discountedPrice } = await calculateDiscountedPrice(product);
        totalPrice += discountedPrice * item.quantity;
      })
    );

    let discount = 0;
    let finalPrice = totalPrice;
    if (coupon.discountType === "percentage") {
      discount = Math.round((coupon.discountValue / 100) * totalPrice);
    } else {
      discount = Math.round(coupon.discountValue);
    }

    finalPrice = totalPrice - discount;

    cart.coupon = coupon._id;
    await cart.save();

    coupon.usedCount += 1;
    await coupon.save();

    res.status(200).json({ success: true, newTotal: finalPrice, discount });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const removeCoupon = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    cart.coupon = null;
    const updatedCart = await cart.save();

    const discount = 0;
    const newTotal = updatedCart.totalPrice;

    res.status(200).json({ success: true, discount, newTotal });
  } catch (error) {
    console.error("Error removing coupon:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  applyCoupon,
  removeCoupon,
};
