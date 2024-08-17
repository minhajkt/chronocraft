const User = require("../../models/usermodel");
const Product = require("../../models/productmodel");
const Category = require("../../models/categoryModel");
const Cart = require("../../models/cartModel");
const Coupon = require("../../models/couponModel");
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

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { productId, quantity = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please log in to add items to cart",
      });
    }

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID is required" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, product: [], totalPrice: 0 });
    }

    const productIndex = cart.product.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (productIndex > -1) {
      cart.product[productIndex].quantity += quantity;
    } else {
      cart.product.unshift({ productId, quantity });
    }

    const product = await Product.findById(productId);
    cart.totalPrice += product.price * quantity;

    await cart.save();

    res.json({
      success: true,
      message: "Product added to cart successfully",
      cartItemCount: cart.product.length,
      productId: productId,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const viewCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const coupons = await Coupon.find({
      active: true,
      expirationDate: { $gt: new Date() },
    });

    if (!userId) {
      return res.redirect("/login");
    }

    let cart = await Cart.findOne({ userId }).populate(
      "product.productId coupon"
    );

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
      const coupon = cart.coupon;
      if (coupon.discountType === "percentage") {
        couponDiscount = Math.round((coupon.discountValue / 100) * totalPrice);
      } else if (coupon.discountType === "amount") {
        couponDiscount = Math.round(coupon.discountValue);
      }
      finalPrice = totalPrice - couponDiscount;
    }

    const filteredCoupons = coupons.map((coupon) => {
      return {
        ...coupon.toObject(),
        isEnabled: totalPrice >= coupon.minimumCartValue,
      };
    });

    res.render("users/cart", {
      cart,
      discount: couponDiscount,
      finalPrice,
      coupon: cart.coupon,
      coupons: filteredCoupons,
    });
  } catch (error) {
    console.error("Error in viewCart:", error);
    res.status(500).render("error", {
      message:
        "An error occurred while viewing the cart. Please try again later.",
    });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { productId } = req.body;
    const cart = await Cart.findOne({ userId }).populate("product.productId");

    if (cart) {
      const productIndex = cart.product.findIndex(
        (item) => item.productId._id.toString() === productId
      );

      if (productIndex > -1) {
        const product = cart.product[productIndex];
        const productPrice = product.productId.price;
        const productQuantity = product.quantity;

        cart.product.splice(productIndex, 1);
        cart.totalPrice -= productPrice * productQuantity;

        await cart.save();
        return res
          .status(200)
          .json({ success: true, message: "Product Removed from the Cart" });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Product not found in the Cart" });
      }
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred" });
  }
};

const updateCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { productId, quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please Log In" });
    }

    if (!productId || quantity < 1) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Product or Quantity" });
    }

    const cart = await Cart.findOne({ userId }).populate("product.productId");

    if (cart) {
      const productIndex = cart.product.findIndex(
        (item) => item.productId._id.toString() === productId
      );
      if (productIndex > -1) {
        const product = cart.product[productIndex];
        const productStock = product.productId.quantity;

        if (quantity > productStock) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for product ${product.productId.name}. Only ${productStock} left in stock.`,
          });
        }

        product.quantity = quantity;
        cart.totalPrice = cart.product.reduce(
          (acc, item) => acc + item.productId.price * item.quantity,
          0
        );

        let discount = 0;
        if (cart.coupon) {
          if (cart.coupon.discountType === "percentage") {
            discount = Math.round(
              (cart.coupon.discountValue / 100) * cart.totalPrice
            );
          } else {
            discount = Math.round(cart.coupon.discountValue);
          }
        }

        const newTotal = cart.totalPrice - discount;

        await cart.save();
        res.status(200).json({
          success: true,
          message: "Cart Updated Successfully",
          newTotal,
          discount,
        });
      } else {
        res
          .status(400)
          .json({ success: false, message: "Product not Found in the Cart" });
      }
    } else {
      res.status(400).json({ success: false, message: "Cart not Found" });
    }
  } catch (error) {
    console.log("error", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const checkStock = async (req, res) => {
  try {
    const { cart } = req.body;

    for (const item of cart) {
      const product = await Product.findById(item.productId);
      if (!product || product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${
            product ? product.name : "unknown"
          }. Only ${product ? product.quantity : "0"} left in stock.`,
        });
      }
    }

    res.json({ success: true, message: "Stock is sufficient" });
  } catch (error) {
    console.log("Error checking stock:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  addToCart,
  viewCart,
  removeFromCart,
  updateCart,
  checkStock,
};
