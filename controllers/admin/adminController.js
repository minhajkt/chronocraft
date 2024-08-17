const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../../models/usermodel");

const Product = require("../../models/productmodel");
const Category = require("../../models/categoryModel");
const Address = require("../../models/addressModel");
const Order = require("../../models/orderModel");

const slugify = require("slugify");
const multer = require("multer");
const path = require("path");
const sharp = require("sharp");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/admin/uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });
const resizeImages = async (files) => {
  const resizePromises = files.map((file) => {
    const resizedPath = `public/admin/uploads/resized/${file.filename}`;
    return sharp(file.path)
      .resize({ width: 300, height: 300, fit: "contain", position: "center" })
      .toFile(resizedPath)
      .then(() => resizedPath);
  });

  return Promise.all(resizePromises);
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

const loadLogin = async (req, res) => {
  try {
    const successMsg = req.query.successMsg;
    res.render("admin/login", { successMsg });
  } catch (error) {
    console.log(error.message);
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email: email });
    console.log("admin login loaded");

    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);

      if (passwordMatch) {
        if (userData.is_admin === 1) {
          req.session.user_id = userData._id;
          res.json({ success: true });
          console.log("admin login success.");
        } else {
          res.json({ success: false, message: "You are not an Admin." });
          console.log("login fail. Not admin");
        }
      } else {
        res.json({
          success: false,
          message: "Invalid Login Credentials. Please try again",
        });
        console.log("login fail. Password do not match");
      }
    } else {
      res.json({
        success: false,
        message: "Invalid Login Credentials. Please try again",
      });
      console.log("login fail. invalid email or password");
    }
  } catch (error) {
    console.log(error.message);
    res.json({
      success: false,
      message: "An error occurred. Please try again.",
    });
  }
};

const loadDashboard = async (req, res) => {
  try {
    const userData = await User.findById({ _id: req.session.user_id });

    let topProducts = [];

    try {
      topProducts = await Order.aggregate([
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalSold: { $sum: "$items.quantity" },
          },
        },

        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails",
          },
        },

        { $unwind: "$productDetails" },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
      ]);
    } catch (error) {
      console.log(error.message);
    }

    let topCategories = [];
    try {
      topCategories = await Order.aggregate([
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        { $unwind: "$productDetails.categories" },
        {
          $group: {
            _id: "$productDetails.categories",
            totalSold: { $sum: "$items.quantity" },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        { $unwind: "$categoryDetails" },
        { $sort: { totalSold: -1 } },
        { $limit: 4 },
      ]);
    } catch (error) {
      console.log(error.message);
    }

    res.render("admin/home", {
      admin: userData,
      topProducts: topProducts,
      topCategories: topCategories,
    });
    console.log("admin home logged");
    console.log(userData);
  } catch (error) {
    console.log(error.message);
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/admin?successMsg=Logged out successfully");
    console.log("admin log out success");
  } catch (error) {
    console.log(error.message);
  }
};

// userslist section

const usersList = async (req, res) => {
  try {
    const message = req.query.message;
    const searchQuery = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = (await searchQuery)
      ? {
          $or: [
            { name: { $regex: searchQuery, $options: "i" } },
            { status: { $regex: searchQuery, $options: "i" } },
          ],
        }
      : {};

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    const userData = await User.find({ is_admin: 0, ...query })
      .sort({ created: -1 })
      .skip(skip)
      .limit(limit);
    res.render("admin/users-list", {
      users: userData,
      searchQuery,
      currentPage: page,
      totalPages,
      totalUsers,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const blockUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { blocked: true },
      { new: true }
    );
    const userData = await User.find({ is_admin: 0 });
    res.json({ success: true, message: "User blocked successfully." });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).send("Server Error");
  }
};

const unblockUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { blocked: false },
      { new: true }
    );
    const userData = await User.find({ is_admin: 0 });
    res.json({ success: true, message: "User unblocked successfully." });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).send("Server Error");
  }
};

const loadCategories = async (req, res) => {
  try {
    const updatemsg = req.query.updatemsg;
    const categories = await Category.find();
    res.render("admin/category", { categories: categories, updatemsg });
  } catch (error) {
    console.log(error.message);
  }
};

const addCategory = async (req, res) => {
  if (req.method == "GET") {
    res.render("admin/add-category");
  }

  try {
    const { name, description, offerDiscount, active } = req.body;
    const category = new Category({
      name,
      description,
      offer: {
        offerDiscount: offerDiscount || 0,
        active: active || false,
      },
    });
    await category.save();

    res.redirect("/admin/category");
  } catch (error) {
    console.log();
  }
};

const editCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const categoryData = await Category.findById({ _id: id });

    if (categoryData) {
      res.render("admin/edit-category", { category: categoryData });
    } else {
      res.redirect("/admin/category");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const updateCategory = async (req, res) => {
  try {
    const { _id, name, description, offerDiscount, active } = req.body;

    const updateCategory = await Category.findByIdAndUpdate(
      _id,
      {
        $set: {
          name: name,
          description: description,
          offer: {
            offerDiscount: offerDiscount || 0,
            active: active || false,
          },
        },
      },
      { new: true }
    );

    if (updateCategory) {
      res.redirect("/admin/category?updatemsg=Category updated successfully");
    } else {
      res.redirect("/admin/category?errormsg=Failed to update the category");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const toggleCategoryStatus = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).send("Category not found");
    }
    category.active = !category.active;
    await category.save();
    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error toggling category status:", error);
    res.status(500).send("Server error");
  }
};

const loadProducts = async (req, res) => {
  try {
    const prodAddSuccess = req.query.prodAddSuccess;
    const updatemsg = req.query.updatemsg;
    const searchQuery = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const query = searchQuery
      ? {
          $or: [
            { name: { $regex: searchQuery, $options: "i" } },
            { description: { $regex: searchQuery, $options: "i" } },
            { "categories.name": { $regex: searchQuery, $options: "i" } },
          ],
        }
      : {};

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(query)
      .populate("categories")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    res.render("admin/load-products", {
      products,
      updatemsg,
      prodAddSuccess,
      searchQuery,
      currentPage: page,
      totalPages,
      totalProducts,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const activateProduct = async (req, res) => {
  try {
    const id = req.params.id;
    console.log("id", id);
    const product = await Product.findByIdAndUpdate(id, { active: true });
    res
      .status(200)
      .send({ message: "Product activated successfully", product });
  } catch (error) {
    res.status(500).send({ message: "Error activating product", error });
  }
};

const deactivateProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findByIdAndUpdate(id, { active: false });
    res
      .status(200)
      .send({ message: "Product deactivated successfully", product });
  } catch (error) {
    res.status(500).send({ message: "Error deactivating product", error });
  }
};

const addProducts = async (req, res) => {
  if (req.method === "GET") {
    try {
      const categories = await Category.find();
      console.log("got categories", categories);
      return res.render("admin/add-product", { categories });
    } catch (error) {
      console.error("Error fetching categories:", error);
      return res.status(500).send("Error fetching categories");
    }
  }

  try {
    const {
      name,
      description,
      price,
      categoryIds,
      quantity,
      offerDiscount,
      active,
    } = req.body;

    const slug = slugify(name, { lower: true });

    const resizedPaths = await resizeImages(req.files);
    const images = req.files.map(
      (file) => `/admin/uploads/resized/${file.filename}`
    );

    const categoryArray = Array.isArray(categoryIds)
      ? categoryIds
      : [categoryIds];
    const categoryObjectIds = categoryArray.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const product = new Product({
      name,
      slug,
      description,
      price,
      quantity,
      images,
      categories: categoryObjectIds,
      offer: {
        offerDiscount: offerDiscount || 0,
        active: active || false,
      },
    });

    await product.save();
    res.redirect(
      "/admin/load-products?prodAddSuccess=Product added Successfully"
    );
  } catch (error) {
    console.log("Error adding product:", error.message);
    res.status(500).send("Error adding product");
  }
};

const editProduct = async (req, res) => {
  try {
    const id = req.query.id;

    const productData = await Product.findById({ _id: id });
    const categories = await Category.find();

    if (productData) {
      res.render("admin/edit-product", { product: productData, categories });
    } else {
      res.redirect("/admin/load-products");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const updateProduct = async (req, res) => {
  try {
    const {
      _id,
      name,
      description,
      price,
      category,
      quantity,
      offerDiscount,
      active,
    } = req.body;

    const categoryArray = Array.isArray(category) ? category : [category];
    const categoryObjectIds = categoryArray.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    let finalImages = [];

    if (req.files && req.files.length > 0) {
      const resizedPaths = await resizeImages(req.files);
      finalImages = resizedPaths.map((path) => path.replace("public", ""));
    }

    const product = await Product.findById(_id);

    if (product) {
      finalImages = [...product.images, ...finalImages];
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      { _id: _id },
      {
        $set: {
          name: name,
          description: description,
          price: price,
          category: categoryObjectIds,
          quantity: quantity,
          images: finalImages,
          "offer.offerDiscount": offerDiscount,
          "offer.active": active === "true",
        },
      },
      { new: true }
    );

    if (updatedProduct) {
      res.redirect(
        "/admin/load-products?updatemsg=Product Updated Successfully"
      );
    } else {
      res.redirect("/admin/load-products?errormsg=Failed to update product");
    }
  } catch (error) {
    console.log(error.message);
    res.redirect(
      "/admin/load-products?errormsg=" + encodeURIComponent(error.message)
    );
  }
};

const deleteImage = async (req, res) => {
  try {
    const { productId, image } = req.query;

    if (!productId || !image) {
      return res.redirect(
        "/admin/load-products?errormsg=" +
          encodeURIComponent("Invalid product ID or image")
      );
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.redirect(
        "/admin/load-products?errormsg=" +
          encodeURIComponent("Invalid product ID")
      );
    }

    const objectId = new mongoose.Types.ObjectId(productId);
    const product = await Product.findById(objectId);

    if (!product) {
      return res.redirect(
        "/admin/load-products?errormsg=" +
          encodeURIComponent("Product not found")
      );
    }
    product.images = product.images.filter((img) => img !== image);
    await product.save();

    res.redirect(`/admin/products/edit-product?id=${productId}`);
  } catch (error) {
    console.error("Failed to delete image:", error.message);
    res.redirect(
      "/admin/load-products?errormsg=" + encodeURIComponent(error.message)
    );
  }
};

const categoryName = async (req, res) => {
  const { categoryName } = req.params;

  try {
    const category = await Category.findOne({ name: categoryName });
    if (!category) {
      return res.status(404).send("Category not found");
    }

    const products = await Product.find({ categories: category._id })
      .populate("categories")
      .exec();
    res.render("admin/category", { products, categoryName });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
};

/////////////////////
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

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().populate("categories").exec();

    const productsWithPrices = await Promise.all(
      products.map(async (product) => {
        const { actualPrice, discountedPrice } = await calculateDiscountedPrice(
          product
        );
        return {
          ...product._doc,
          actualPrice,
          discountedPrice,
        };
      })
    );

    res.json(productsWithPrices);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
};

const getSingleProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId).populate("categories");

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const { actualPrice, discountedPrice } = await calculateDiscountedPrice(
      product
    );

    res.json({
      ...product._doc,
      actualPrice,
      discountedPrice,
    });

    res.json(productsWithPrices);
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  loadLogin,
  verifyLogin,
  loadDashboard,
  logout,
  usersList,
  blockUser,
  unblockUser,
  loadProducts,
  activateProduct,
  deactivateProduct,
  addProducts,
  upload,
  editProduct,
  updateProduct,
  deleteImage,
  getAllProducts,
  getAllCategories,
  getSingleProduct,
  loadCategories,
  addCategory,
  editCategory,
  toggleCategoryStatus,
  updateCategory,
  categoryName,
};
