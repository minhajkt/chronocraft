const express = require("express");
const admin_route = express.Router();

const auth = require("../middlewares/auth");

const adminController = require("../controllers/adminController");

admin_route.get("/", auth.isLogout, adminController.loadLogin);
admin_route.post("/", auth.isLogout, adminController.verifyLogin);

admin_route.get("/home", auth.isLogin, adminController.loadDashboard);

admin_route.get("/home", auth.isLogin, adminController.loadDashboard);

admin_route.get("/logout", auth.isLogin, adminController.logout);

// routes for userslist for the admin

admin_route.get("/users-list", auth.isLogin, adminController.usersList);

admin_route.put(
  "/users-list/:id/block",
  auth.isLogin,
  adminController.blockUser
);

admin_route.put(
  "/users-list/:id/unblock",
  auth.isLogin,
  adminController.unblockUser
);

// routes for product list for the admin

admin_route.get("/load-products", auth.isLogin, adminController.loadProducts);
admin_route.get(
  "/products/add-product",
  auth.isLogin,
  adminController.addProducts
);
admin_route.post(
  "/products/add-product",
  adminController.upload.array("images", 3),
  adminController.addProducts
);

admin_route.put(
  "/products/:id/activate",
  auth.isLogin,
  adminController.activateProduct
);
admin_route.put(
  "/products/:id/deactivate",
  auth.isLogin,
  adminController.deactivateProduct
);

admin_route.get(
  "/products/edit-product",
  auth.isLogin,
  adminController.editProduct
);
admin_route.post(
  "/products/edit-product",
  adminController.upload.array("images", 10),
  adminController.updateProduct
);

admin_route.get("/all-products", adminController.getAllProducts);
admin_route.get("/all-categories", adminController.getAllCategories);

admin_route.get("/product/:id", adminController.getSingleProduct);

// admin_route.post("/createcategories", adminController.createCategories);



admin_route.get('/category',adminController.loadCategories)



admin_route.get('/category/add-category',adminController.addCategory)
admin_route.post('/category/add-category', adminController.addCategory)

admin_route.get('/category/edit-category',adminController.editCategory)
admin_route.post('/category/edit-category',adminController.updateCategory)

admin_route.get(
  "/category/:categoryName",
  auth.isLogin,
  adminController.categoryName
);

admin_route.get('/category',adminController.loadCategories)

// admin_route.put('/admin/category/:id/activate',auth.isLogin, adminController.activateCategory);
// admin_route.put('/admin/category/:id/deactivate',auth.isLogin, adminController.deactivateCategory);

admin_route.post('/category/toggle-status/:id', adminController.toggleCategoryStatus);

admin_route.get('/products/delete-image',auth.isLogin,adminController.deleteImage)

module.exports = admin_route;
