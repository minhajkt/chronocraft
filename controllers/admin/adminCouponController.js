const Coupon = require("../../models/couponModel");
const Cart = require("../../models/cartModel");

const getCouponPage = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    const successMsg = req.flash("successMsg");
    res.render("admin/coupon-details", { coupons, successMsg });
  } catch (error) {
    console.log(error.message);
    res
      .status(500)
      .json({ success: false, message: "Internal server Error ! " });
  }
};

const addCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      expirationDate,
      usageLimit,
      minimumCartValue,
    } = req.body;

    const newCoupon = new Coupon({
      code,
      discountType,
      discountValue,
      expirationDate,
      usageLimit,
      minimumCartValue,
    });

    await newCoupon.save();

    req.flash("successMsg", "Coupon added successfully");

    res.redirect("/admin/coupon-details");
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateCouponUsage = async (req, res) => {
  try {
    const { code } = req.body;
    const coupon = await Coupon.findOneAndUpdate(
      { code, active: true },
      { $inc: { usedCount: 1 } },
      { new: true }
    );

    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found or inactive" });
    }

    res.redirect("/admin/coupon-details?couponUpdationMsg");
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const activateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const coupon = await Coupon.findByIdAndUpdate(
      couponId,
      { active: true },
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({ message: "Coupon activated", coupon });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deactivateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const coupon = await Coupon.findByIdAndUpdate(
      couponId,
      { active: false },
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({ message: "Coupon deactivated", coupon });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  addCoupon,
  getCouponPage,
  updateCouponUsage,
  activateCoupon,
  deactivateCoupon,
};
