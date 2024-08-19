const User = require("../../models/usermodel");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const axios = require("axios");
const Product = require("../../models/productmodel");
const Category = require("../../models/categoryModel");
const Address = require("../../models/addressModel");
const Cart = require("../../models/cartModel");
const dotenv = require("dotenv").config();
const passport = require("passport");
const { google } = require("googleapis");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

const sendVerifyMail = async (name, email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: "minhajkt17@gmail.com",
        pass: process.env.authPassword,
      },
    });

    const mailoptions = {
      from: "minhajkt17@gmail.com",
      to: email,
      subject: "For verification mail from ChronoCraft",
      html: `<p>Hello${name}. Please use this otp:${otp} to verify your email</p>`,
    };

    await transporter.sendMail(mailoptions, function (error, info) {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email has been sent:- ", info.response);
      }
    });
  } catch (error) {
    console.error("Error in sendVerifyMail:", error);
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.clientID,
      clientSecret: process.env.clientSecret,
      callbackURL: "https://www.chronocraft.xyz/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          console.log("user returened", user);
          return done(null, user);
        } else {
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            is_admin: 0,
            is_verified: 1,
            blocked: false,
          });
          await user.save();
          console.log("New user created:", user);
          return done(null, user);
        }
      } catch (error) {
        console.log(error.message);
        return done(error, null);
      }
    }
  )
);

// Serialize and deserialize user sessions (required by Passport)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id.toString());

    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

const loadRegister = async (req, res) => {
  try {
    res.render("users/registration");
  } catch (error) {
    console.log(error.message);
  }
};

const insertUser = async (req, res) => {
  try {
    if (req.body.password !== req.body.confirm_password) {
      return res.render("users/registration", {
        message: "Your passwords does not match",
      });
    }

    const spassword = await securePassword(req.body.password);
    const otp = crypto.randomInt(100000, 999999);
    const otpExpires = Date.now() + 60000;

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: spassword,
      is_admin: 0,
      otp: otp,
      otpExpires: otpExpires,
    });

    const userData = await user.save();

    if (userData) {
      await sendVerifyMail(req.body.name, req.body.email, otp);
      res.render("users/otp-verification", {
        email: req.body.email,
        message:
          "User registration successful. Please Enter the OTP sent to your Registered Email for loggin in",
        otp: otp,
        otpExpires: otpExpires,
      });
    } else {
      res.render("users/registration", { message: "User registration failed" });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email });

    if (user) {
      if (user.otp === parseInt(otp) && user.otpExpires > Date.now()) {
        user.otp = null;
        user.otpExpires = null;
        user.is_verified = 1;
        await user.save();

        res.render("users/otp-success", { otpExpires: user.otpExpires });
      } else {
        res.render("users/otp-verification", {
          email: email,
          message: "Invalid or expired OTP. Please enter again.",
          otp: otp,
          otpExpires: user.otpExpires,
        });
      }
    } else {
      res.render("users/otp-resend", {
        message: "User not found",
        email: email,
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const getOtpExpires = async (req, res) => {
  try {
    const { email } = req.query;
    const user = await User.findOne({ email: email });

    if (user) {
      const otpExpiresTimestamp = new Date(user.otpExpires).getTime();
      res.json({ otpExpires: otpExpiresTimestamp });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const resendOtp = async (req, res) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email: email });

    if (user) {
      const otp = crypto.randomInt(100000, 999999);
      const otpExpires = Date.now() + 60000;

      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();

      await sendVerifyMail(user.name, user.email, otp);

      res.render("users/otp-verification", {
        email: user.email,
        message:
          "OTP resent successfully. Please Enter the OTP sent to your Registered Email.",
        otpExpires: otpExpires,
      });
    } else {
      res.render("users/otp-verification", {
        email: email,
        message: "User not found",
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const loadSuccess = (req, res) => {
  res.render("users/login", {
    otpsuccessmsg:
      "Your email has been successfully verified. You can now log in.",
  });
};

const loadLogin = async (req, res) => {
  try {
    const blockMsg = req.query.blockMsg;

    res.render("users/login", { blockMsg });
    console.log("login loaded");
  } catch (error) {
    console.log(error.message);
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email: email });

    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        if (userData.is_verified) {
          if (!userData.blocked) {
            req.session.user_id = userData._id;
            req.flash("success", "Login Successful");
            res.json({ success: true });
          } else {
            res.json({
              success: false,
              message: "You are temporarily blocked.",
            });
          }
        } else {
          res.json({
            success: false,
            message: "Please verify your Email before logging in",
          });
        }
      } else {
        res.json({
          success: false,
          message: "Invalid Login Credentials. Please try again",
        });
      }
    } else {
      res.json({
        success: false,
        message: "Invalid Login Credentials. Please try again",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.json({
      success: false,
      message: "An error occurred. Please try again.",
    });
  }
};

const loadHomePage = async (req, res) => {
  try {
    const user = req.session.user_id;
    const searchQuery = req.query.query || "";
    const priceRanges = Array.isArray(req.query.price)
      ? req.query.price
      : [req.query.price].filter(Boolean);

    // Fetch products and categories
    const [productsResponse, categoriesResponse] = await Promise.all([
      axios.get("http://localhost:3000/admin/all-products"),
      axios.get("http://localhost:3000/admin/all-categories"),
    ]);


    // Filter active categories
    const activeCategories = categoriesResponse.data.filter(
      (category) => category.active
    );
    const activeCategoryIds = new Set(
      activeCategories.map((category) => category._id.toString())
    );


    // Filter active products that belong to active categories
    let products = productsResponse.data.filter((product) => {
      const productCategoryIds = product.categories.map((category) =>
        category._id.toString()
      );
      return (
        product.active &&
        productCategoryIds.some((categoryId) =>
          activeCategoryIds.has(categoryId)
        )
      );
    });

    // Populate wishlist if user is logged in
    let wishlistProducts = [];
    if (user) {
      const userId = await User.findById(user).populate("wishlist");
      if (userId && userId.wishlist) {
        wishlistProducts = userId.wishlist.map((product) =>
          product._id.toString()
        );
      }
    }

    // Filter products based on search query
    if (searchQuery) {
      products = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.description &&
            product.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
    }

    // Render home page with filtered products and categories
    res.render("home", {
      products,
      categories: activeCategories,
      searchQuery,
      wishlistProducts,
      user,
    });
  } catch (error) {
    console.log(error.message);
    res
      .status(500)
      .render("error", {
        message:
          "An error occurred while loading the home page. Please try again later.",
      });
  }
};

const loadHome = async (req, res) => {
  try {
    const userData = await User.findOne({ _id: req.session.user_id });
    const response = await axios.get(
      "http://localhost:3000/admin/all-products"
    );
    const categoryResponse = await axios.get(
      "http://localhost:3000/admin/all-categories"
    );
    const products = response.data.filter((product) => product.active);
    const categories = categoryResponse.data.filter(
      (category) => category.active
    );
    if (userData) {
      res.render("home", {
        message: "Login success",
        user: userData,
        categories,
        products,
        success: req.flash("success"),
      });
      console.log("Home is loaded");
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const loadProducts = async (req, res) => {
  try {
    const response = await axios.get(
      "http://localhost:3000/admin/all-products"
    );
    const categoryResponse = await axios.get(
      "http://localhost:3000/admin/all-categories"
    );
    const products = response.data.filter((product) => product.active);
    const categories = categoryResponse.data.filter(
      (category) => category.active
    );
    res.render("users/viewproducts", { products, categories });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Error fetching products" });
  }
};

const loadShop = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const sort = req.query.sort || "new-arrivals";
    const minPrice = parseInt(req.query.minPrice) || 0;
    const maxPrice = parseInt(req.query.maxPrice) || Infinity;
    const searchQuery = req.query.query || "";
    const priceRanges = Array.isArray(req.query.price)
      ? req.query.price
      : [req.query.price].filter(Boolean);
    const selectedCategories = Array.isArray(req.query.category)
      ? req.query.category
      : [req.query.category].filter(Boolean);
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId);

    const [productsResponse, categoriesResponse] = await Promise.all([
      axios.get("http://localhost:3000/admin/all-products"),
      axios.get("http://localhost:3000/admin/all-categories"),
    ]);

    const activeCategories = categoriesResponse.data.filter(
      (category) => category.active
    );
    const activeCategoryIds = activeCategories.map((category) =>
      category._id.toString()
    );

    let activeProducts = productsResponse.data.filter((product) => {
      return (
        product.active &&
        product.categories.some((category) => {
          const categoryId = category._id
            ? category._id.toString()
            : category.toString();
          return activeCategoryIds.includes(categoryId);
        })
      );
    });

    if (selectedCategories.length > 0) {
      activeProducts = activeProducts.filter((product) =>
        product.categories.some((category) =>
          selectedCategories.includes(
            category._id ? category._id.toString() : category.toString()
          )
        )
      );
    }

    let wishlistProducts = [];
    if (userId) {
      const user = await User.findById(userId).populate("wishlist");
      wishlistProducts = user.wishlist.map((product) => product._id.toString());
    }

    let searchedProducts = activeProducts;

    if (searchQuery) {
      activeProducts = activeProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.description &&
            product.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
    }

    if (priceRanges.length > 0) {
      activeProducts = activeProducts.filter((product) => {
        return priceRanges.some((range) => {
          const [min, max] = range.split("-").map(Number);
          return product.price >= min && (max ? product.price <= max : true);
        });
      });
    }

    activeProducts = activeProducts.filter(
      (product) => product.price >= minPrice && product.price <= maxPrice
    );

    let sortedProducts;
    switch (sort) {
      case "price-asc":
        sortedProducts = activeProducts
          .slice()
          .sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sortedProducts = activeProducts
          .slice()
          .sort((a, b) => b.price - a.price);
        break;
      case "new-arrivals":
        sortedProducts = activeProducts
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "a-z":
        sortedProducts = activeProducts
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "z-a":
        sortedProducts = activeProducts
          .slice()
          .sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        sortedProducts = activeProducts
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const totalProducts = sortedProducts.length;

    const paginatedProducts = sortedProducts.slice(skip, skip + limit);

    let cartProducts = [];
    if (userId) {
      const cart = await Cart.findOne({ userId }).populate("product.productId");
      if (cart) {
        cartProducts = cart.product.map((item) =>
          item.productId._id.toString()
        );
      }
    }

    res.render("users/shop", {
      user,
      products: paginatedProducts,
      category: activeCategories,
      cartProducts,
      wishlistProducts,
      searchQuery,
      priceRanges,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      sort,
      selectedCategories,
      queryParams: req.query,
      totalProducts,
      limit,
    });
  } catch (error) {
    console.error("Error in loadShop:", error);
    res
      .status(500)
      .render("error", {
        message:
          "An error occurred while loading the shop. Please try again later.",
      });
  }
};

const categoryProducts = async (req, res) => {
  const { categoryName } = req.params;

  try {
    const category = await Category.findOne({
      name: categoryName,
      active: true,
    });

    if (!category) {
      return res.render("users/inactive-category");
    }

    if (!category) {
      return res.status(404).send("Category not found");
    }

    const products = await Product.find({ categories: category._id })
      .populate("categories")
      .exec();

    res.render("users/cat", { products, categoryName });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
};

const loadProductDetails = async (req, res) => {
  try {
    const searchQuery = req.query.query || "";
    const products = await Product.find();
    const productId = req.params.id;
    const response = await axios.get(
      `http://localhost:3000/admin/product/${productId}`
    );
    const product = response.data;

    if (!product || !product.active) {
      console.log("Product not found");
      return res.redirect("/users/shop");
    }
    res.render("users/product-details", { product, products, searchQuery });
  } catch (error) {
    res
      .status(404)
      .json({ success: false, message: "!Error 404 Page not found" });
    console.log("Error loading product details", error.message);
  }
};

const userLogout = async (req, res) => {
  try {
    const blockMsg = req.query.blockMsg;
    req.session.destroy();

    res.render("users/login", {
      messageLogout: "Logged out Successfully",
      blockMsg,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const contactDetails = async (req, res) => {
  res.render("users/contact-us");
};

const userProfile = async (req, res) => {
  try {
    const msg = req.query.updateMsg;
    const userData = await User.findById({ _id: req.session.user_id });
    console.log(userData);
    if (userData) {
      res.render("users/profile-details", { userData: userData, msg });
    } else {
      redirect("/home");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const editUserData = async (req, res) => {
  try {
    const userData = await User.findById({ _id: req.session.user_id });
    console.log(userData);
    if (userData) {
      res.render("users/edit-profile", { userData: userData });
    } else {
      redirect("/home");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { name, email, mobile } = req.body;

    const userData = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          name: name,
          email: email,
          mobile: mobile,
        },
      },
      { new: true }
    );
    if (userData) {
      req.flash("success", "User Details Edited Successfully");
      res.redirect("/profile-details");
    } else {
      res.redirect("/edit-profile?updateMsg=User details updation failed");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const sendResetPasswordEmail = async (email, token) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: "minhajkt17@gmail.com",
        pass: process.env.authPassword,
      },
    });

    const mailOptions = {
      from: "minhajkt17@gmail.com",
      to: email,
      subject: "Password Reset Request",
      html: `<p>You requested for a password reset. Click <a href="http://localhost:3000/reset-password?token=${token}">here</a> to reset your password.</p>`,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    const passwordMsg = req.query.passwordMsg;
    if (!user) {
      res.redirect("/forgot-password?passwordMsg");
      return res.status(400).send("User with the given email does not exist.");
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    await sendResetPasswordEmail(user.email, token);
    res.redirect(
      "/forgot-password?passwordMsg=Password Reset Link has been sent to your Email"
    );
    console.log("token", `http://localhost:3000/reset-password?token=${token}`);
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).send("Internal Server Error");
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    const spassword = await securePassword(password);
    user.password = spassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.redirect(
      "/reset-password?successMsg=Your password reset is successfull"
    );
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getResetPassword = async (req, res) => {
  const { token } = req.query;
  try {
    const successMsg = req.query.successMsg;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    res.render("users/reset-password", { token, successMsg });
  } catch (error) {
    console.error("Error in getResetPassword:", error);
    res.status(500).send("Internal Server Error");
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user_id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    if (user.wishlist.includes(productId)) {
      return res.json({
        success: false,
        message: "Product already in wishlist.",
      });
    }

    user.wishlist.push(productId);
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Error adding to wishlist:", error.message);
    res.status(500).json({ success: false, message: "An error occurred." });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user_id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing from wishlist:", error.message);
    res.status(500).json({ success: false, message: "An error occurred." });
  }
};

const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId).populate("wishlist");
    if (!user) {
      return res.status(404).render("error", { message: "User not found." });
    }

    const wishlistProducts = user.wishlist;

    res.render("users/wishlist", {
      wishlistProducts,
    });
  } catch (error) {
    console.error("Error rendering wishlist:", error.message);
    res
      .status(500)
      .render("error", {
        message:
          "An error occurred while loading the wishlist. Please try again later.",
      });
  }
};

module.exports = {
  loadRegister,
  insertUser,
  verifyOtp,
  resendOtp,
  loadLogin,
  verifyLogin,
  loadHomePage,
  loadHome,
  loadSuccess,
  userLogout,
  getOtpExpires,
  loadProducts,
  loadShop,
  loadProductDetails,
  categoryProducts,
  contactDetails,
  userProfile,
  editUserData,
  updateProfile,
  forgotPassword,
  resetPassword,
  getResetPassword,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
};
