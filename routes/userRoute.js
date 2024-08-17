const express = require("express");
const user_route = express.Router();
const auth = require("../middlewares/auth");
const passport = require("passport");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const userController = require("../controllers/users/userController");
const addressController = require("../controllers/users/addressController");
const cartController = require("../controllers/users/cartController");
const checkoutController = require("../controllers/users/checkoutController");
const orderController = require("../controllers/users/orderController");
const couponController = require("../controllers/users/couponController");

user_route.get("/register", auth.isLogout, userController.loadRegister);
user_route.post("/register", userController.insertUser);

user_route.get("/verify-otp", userController.verifyOtp);
user_route.post("/verify-otp", userController.verifyOtp);

user_route.get("/success", userController.loadSuccess);

user_route.get("/resend-otp", userController.resendOtp);
user_route.post("/resend-otp", userController.resendOtp);

user_route.get("/otp-resend", userController.resendOtp);

user_route.get("/get-otp-expires", userController.getOtpExpires);

user_route.get("/", userController.loadHomePage);
user_route.post("/", userController.verifyLogin);

user_route.get("/login", auth.isLogout, userController.loadLogin);
user_route.post("/login", userController.verifyLogin);

user_route.get("/home", userController.loadHomePage);

user_route.get("/logout", auth.isLogin, userController.userLogout);

user_route.get("/viewproducts", userController.loadProducts);

user_route.get("/shop", userController.loadShop);

user_route.get("/product/:id", userController.loadProductDetails);

user_route.get("/category/:categoryName", userController.categoryProducts);

user_route.get("/contact-us", userController.contactDetails);

user_route.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

user_route.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  async (req, res) => {
    try {
      const user = req.user;
      if (user.blocked) {
        return res.redirect("/login?blockMsg=You are temporarily blocked");
      }
      req.session.user_id = req.user.id;
      res.redirect("/home");
    } catch (error) {
      console.log(error.message);
    }
  }
);

user_route.get("/profile-details", auth.isLogin, userController.userProfile);

user_route.post("/edit-userdata", auth.isLogin, userController.updateProfile);

user_route.get("/edit-profile", auth.isLogin, userController.updateProfile);
user_route.post("/edit-profile", auth.isLogin, userController.updateProfile);

user_route.get(
  "/manage-address",
  auth.isLogin,
  addressController.manageAddress
);
user_route.get("/add-address", auth.isLogin, addressController.addAddress);
user_route.post("/add-address", auth.isLogin, addressController.addAddress);

user_route.get(
  "/edit-address/:addressId",
  auth.isLogin,
  addressController.editAddress
);
user_route.patch(
  "/edit-address/:addressId",
  auth.isLogin,
  addressController.editAddress
);

user_route.post("/delete-address", addressController.deleteAddress);

user_route.get(
  "/change-password",
  auth.isLogin,
  addressController.getChangePassword
);
user_route.post(
  "/change-password",
  auth.isLogin,
  addressController.changePassword
);

user_route.post("/add-to-cart", cartController.addToCart);
user_route.get("/cart", auth.isLogin, cartController.viewCart);
user_route.post("/remove-from-cart", cartController.removeFromCart);
user_route.post("/update-cart", cartController.updateCart);
user_route.post("/check-stock", cartController.checkStock);

user_route.get(
  "/checkout-address",
  auth.isLogin,
  checkoutController.getAddressPage
);
user_route.post("/checkout-address", checkoutController.submitAddress);

user_route.get("/payment", checkoutController.getPaymentPage);

user_route.post("/confirm-order", orderController.confirmOrder);
user_route.get("/view-orders", auth.isLogin, orderController.loadOrders);
user_route.get(
  "/view-order-details/:id",
  auth.isLogin,
  orderController.viewOrderDetails
);

user_route.post("/cancel-order", auth.isLogin, orderController.cancelOrders);
user_route.post("/return-order", auth.isLogin, orderController.returnOrder);

user_route.get("/wallet", auth.isLogin, orderController.getWallet);

user_route.get("/forgot-password", (req, res) => {
  const passwordMsg = req.query.passwordMsg;
  res.render("users/forgot-password-form", { passwordMsg });
});
user_route.post("/forgot-password", userController.forgotPassword);

user_route.get("/reset-password", userController.getResetPassword);
user_route.post("/reset-password", userController.resetPassword);

user_route.post("/apply-coupon", couponController.applyCoupon);
user_route.post("/remove-coupon", couponController.removeCoupon);

user_route.post("/add-to-wishlist", auth.isLogin, userController.addToWishlist);
user_route.post("/remove-from-wishlist", userController.removeFromWishlist);

user_route.get("/wishlist", auth.isLogin, userController.getWishlist);

const razorpay = new Razorpay({
  key_id: "rzp_test_VApTinR8991MNk",
  key_secret: "Yi2MX0Q3aLYPSlswSU5CMpfP",
});

user_route.post("/create-razorpay-order", orderController.createRazorpayOrder);

user_route.post("/confirm-order-online", orderController.confirmOrderOnline);

user_route.post("/retry-payment", orderController.retryPayment);
user_route.post("/confirm-retry-payment", orderController.confirmRetryPayment);

user_route.get("/payment-success", (req, res) => {
  res.render("users/payment-success");
});

module.exports = user_route;
