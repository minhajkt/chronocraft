const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');
const User = require("../models/usermodel");

const Product = require('../models/productmodel')
const Category = require('../models/categoryModel'); 

const slugify = require('slugify')
const multer = require('multer')
const path = require('path')
const sharp = require('sharp')

const storage = multer.diskStorage({
    destination: function(req, file,cb){
        cb(null, 'public/admin/uploads')
    },
    filename: function(req,file,cb){
        cb(null, Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({storage: storage});
const resizeImages = async (files) => {
    console.log("resizing");
    const resizePromises = files.map(file => {
        const resizedPath = `public/admin/uploads/resized/${file.filename}`;
        return sharp(file.path)
            .resize({ width: 300, height:300, fit: 'contain', position: 'center' }) 
            .toFile(resizedPath)
            .then(() => resizedPath); 
            
    });
        // console.log("resizedPath",resizedPath);
        console.log("sharp",sharp);
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
    const successMsg = req.query.successMsg
    res.render("admin/login", {successMsg });
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
            res.json({ success: false, message: 'You are not an Admin.' });
            console.log("login fail. Not admin");
          }
        } else {
          res.json({ success: false, message: 'Invalid Login Credentials. Please try again' });
          console.log("login fail. Password do not match");
        }
      } else {
        res.json({ success: false, message: 'Invalid Login Credentials. Please try again' });
        console.log("login fail. invalid email or password");
      }
    } catch (error) {
      console.log(error.message);
      res.json({ success: false, message: 'An error occurred. Please try again.' });
    }
  };
  


const loadDashboard = async(req,res)=> {
    try {
        const userData = await User.findById({_id:req.session.user_id})
        res.render('admin/home',{admin: userData})
        console.log('admin home logged');
        console.log(userData);
    } catch (error) {
        console.log(error.message);
    }
}

const logout = async(req,res)=>{
    try {
        req.session.destroy()
        res.redirect('/admin?successMsg=Logged out successfully')
        console.log('admin log out success');
    } catch (error) {
        console.log(error.message);
    }
}

// userslist section

const usersList = async(req, res)=>{
    try {
        const userData = await User.find({is_admin:0})
        const message = req.query.message
    res.render('admin/users-list', {users:userData })
    } catch (error) {
        console.log(error.message);
    }
}




const blockUser = async (req, res) => {
    const userId = req.params.id;

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, { blocked: true }, { new: true });
        const userData = await User.find({ is_admin: 0 });
        res.render('admin/users-list', { users: userData });
        console.log('User blocked:', updatedUser);
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).send('Server Error');
    }
};

const unblockUser = async (req, res) => {
    const userId = req.params.id;

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, { blocked: false }, { new: true });
        const userData = await User.find({ is_admin: 0 });
        res.render('admin/users-list', { users: userData });
        console.log('User unblocked:', updatedUser);
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).send('Server Error');
    }
};

// Category


// const createCategories = async () => {
//     try {
//         const categoriesToCreate = [
//             { name: 'Digital', description: 'Digital watches' },
//             { name: 'Analog', description: 'Analog watches' },
//             { name: 'Smartwatch', description: 'Smartwatches' }
//         ];

//         for (const categoryData of categoriesToCreate) {
//             const existingCategory = await Category.findOne({ name: categoryData.name });
//             if (!existingCategory) {
//                 const category = new Category(categoryData);
//                 await category.save();
//                 console.log(`Category '${categoryData.name}' created successfully`);
//             } else {
//                 console.log(`Category '${categoryData.name}' already exists`);
//             }
//         }
//     } catch (error) {
//         console.error('Error creating categories:', error);
//     }
// };

// createCategories();

const loadCategories = async(req,res) => {
    try {
        const updatemsg = req.query.updatemsg
        const categories = await Category.find()
            res.render('admin/category', {categories:categories, updatemsg})
        
    } catch (error) {
        console.log(error.message);
    }
}


const addCategory = async(req,res) => {
    if(req.method == 'GET'){
        res.render('admin/add-category')
    }
    
    try {
        const {name, description, active} = req.body
        const category = new Category({name, description, active})
        await category.save()

        res.redirect('/admin/category')
        console.log('category', category);
    } catch (error) {
        console.log();
    }
}

const editCategory = async(req, res) => {
    try {
        const id = req.query.id
        console.log('id',id);
        console.log('type',typeof id);
        const categoryData = await Category.findById({_id:id})
        
        if(categoryData){
            res.render('admin/edit-category',{category:categoryData})
        }else{
            res.redirect('/admin/category')
        }
        
    } catch (error) {
        console.log(error.message);
    }
}

const updateCategory = async(req,res)=>{
    try {
        
        const {_id,name, description} = req.body;
        console.log("name",name);
        console.log("id",_id);

        const updateCategory = await Category.findByIdAndUpdate(
            _id,
            {
                $set:{
                    name: name,
                    description: description
                }
            },
            {new: true}
        );

        if(updateCategory){
            res.redirect('/admin/category?updatemsg=Category updated successfully')
        }else{
            res.redirect('/admin/category?errormsg=Failed to update the category')
        }

    } catch (error) {
        console.log(error.message);
    }
}

    const toggleCategoryStatus = async (req, res) => {
        try {
            const categoryId = req.params.id;
            const category = await Category.findById(categoryId);
            if (!category) {
                return res.status(404).send('Category not found');
            }
            category.active = !category.active;
            await category.save();
            res.redirect('/admin/category'); 
        } catch (error) {
            console.error('Error toggling category status:', error);
            res.status(500).send('Server error');
        }
    };


    // const activateCategory = async (req, res) => {
    //     try {
    //         const id = req.params.id;
    //         console.log('id',id);
    //         const category = await Category.findByIdAndUpdate(id, { active: true });
    //         res.status(200).send({ message: 'Category activated successfully', category});
    //     } catch (error) {
    //         res.status(500).send({ message: 'Error activating category', error });
    //     }
    // };
    
    // const deactivateCategory = async (req, res) => {
    //     try {
    //         const id = req.params.id;
    //         console.log('id',id);
    //         const category = await Category.findByIdAndUpdate(id, { active: false });
    //         res.status(200).send({ message: 'Category deactivated successfully', category });
    //     } catch (error) {
    //         res.status(500).send({ message: 'Error deactivating category', error });
    //     }
    // };

// const activateCategory = async (req, res) => {
//     try {
//         const categoryId = req.params.id;
//         console.log('id',categoryId);
//         const category = await Category.findById(categoryId);
//         if (!category) {
//             return res.status(404).json({ message: 'Category not found' });
//         }
//         category.active = true;
//         await category.save();
//         res.status(200).json({ message: 'Category activated successfully', category });
//     } catch (error) {
//         res.status(500).json({ message: 'Error activating category', error });
//     }
// };

// const deactivateCategory = async (req, res) => {
//     try {
//         const categoryId = req.params.id;
//         console.log('id',categoryId);
//         const category = await Category.findById(categoryId);
//         if (!category) {
//             return res.status(404).json({ message: 'Category not found' });
//         }
//         category.active = false;
//         await category.save();
//         res.status(200).json({ message: 'Category deactivated successfully', category });
//     } catch (error) {
//         res.status(500).json({ message: 'Error deactivating category', error });
//     }
// };

// // Productlist section

const loadProducts = async(req, res) => {
    try {
        const updatemsg = req.query.updatemsg
        const products = await Product.find({}).populate('categories')
        // console.log(products)
        res.render('admin/load-products', {products,updatemsg})
    } catch (error) {
        console.log(error.message);
    }
} 

const activateProduct = async (req, res) => {
    try {
        const id = req.params.id;
        console.log('id',id);
        const product = await Product.findByIdAndUpdate(id, { active: true });
        res.status(200).send({ message: 'Product activated successfully', product });
    } catch (error) {
        res.status(500).send({ message: 'Error activating product', error });
    }
};

const deactivateProduct = async (req, res) => {
    try {
        const id = req.params.id;
        console.log('id',id);
        const product = await Product.findByIdAndUpdate(id, { active: false });
        res.status(200).send({ message: 'Product deactivated successfully', product });
    } catch (error) {
        res.status(500).send({ message: 'Error deactivating product', error });
    }
};

const addProducts = async (req, res) => {
    if (req.method === 'GET') {
        try {
            const categories = await Category.find();
            console.log("got categories", categories);
            return res.render('admin/add-product', { categories });
        } catch (error) {
            console.error('Error fetching categories:', error);
            return res.status(500).send('Error fetching categories');
        }
    }

    try {
        const { name, description, price, categoryIds, quantity } = req.body;

        const slug = slugify(name, { lower: true });

        const resizedPaths = await resizeImages(req.files);
        const images = req.files.map(file => `/admin/uploads/resized/${file.filename}`);

        const categoryArray = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
        const categoryObjectIds = categoryArray.map(id =>new mongoose.Types.ObjectId(id));

        const product = new Product({
            name,
            slug,
            description,
            price,
            quantity,
            images,
            categories: categoryObjectIds,
        });

        await product.save();
        res.redirect('/admin/load-products');
    } catch (error) {
        console.log('Error adding product:', error.message);
        res.status(500).send('Error adding product');
    }
};

const editProduct = async(req, res) => {
    try {
        
        console.log("edit loaded");
        const id = req.query.id 
        console.log('id',id)
        console.log('type',typeof id);
        const productData = await Product.findById({_id:id})
        console.log(typeof id,id);
        console.log("proudct data",productData);
        const categories = await Category.find();

            if(productData){
                res.render('admin/edit-product', {product:productData, categories, })
            }else{
                res.redirect('/admin/load-products')
            }
        
    } catch (error) {
        console.log(error.message);
    }
}



const updateProduct = async (req, res) => {
    try {
        const { _id, name, description, price, category, quantity } = req.body;

        
        const categoryArray = Array.isArray(category) ? category : [category];
        const categoryObjectIds = categoryArray.map(id => new mongoose.Types.ObjectId(id));

        
        let finalImages = [];

   
        if (req.files && req.files.length > 0) {
            
            const resizedPaths = await resizeImages(req.files);
            finalImages = resizedPaths.map(path => path.replace('public', ''));
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
                    images: finalImages  
                }
            },
            { new: true } 
        );

        if (updatedProduct) {
            res.redirect('/admin/load-products?updatemsg=Product Updated Successfully');
        } else {
            res.redirect('/admin/load-products?errormsg=Failed to update product');
        }
    } catch (error) {
        console.log(error.message);
        res.redirect('/admin/load-products?errormsg=' + encodeURIComponent(error.message));
    }
};


const deleteImage = async (req, res) => {
    try {
        const { productId, image } = req.query;

        if (!productId || !image) {
            return res.redirect('/admin/load-products?errormsg=' + encodeURIComponent('Invalid product ID or image'));
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.redirect('/admin/load-products?errormsg=' + encodeURIComponent('Invalid product ID'));
        }

        const objectId = new mongoose.Types.ObjectId(productId);
        const product = await Product.findById(objectId);

        if (!product) {
            return res.redirect('/admin/load-products?errormsg=' + encodeURIComponent('Product not found'));
        }
        product.images = product.images.filter(img => img !== image);
        await product.save();

        res.redirect(`/admin/products/edit-product?id=${productId}`);
    } catch (error) {
        console.error('Failed to delete image:', error.message);
        res.redirect('/admin/load-products?errormsg=' + encodeURIComponent(error.message));
    }
};


// const updateProduct = async(req, res)=>{

//     try {
//         console.log('update loaded');
        
        
//         const {_id, name, description,price, category, quantity } = req.body;
//         console.log(typeof _id, _id);
//         console.log('name',name) 
//         const categoryArray = Array.isArray(category) ? category : [category];
//         const categoryObjectIds = categoryArray.map(id => new mongoose.Types.ObjectId(id));

//         let imagesArray = req.body.images;
//         if (req.files && req.files.length > 0) {
//             const resizedPaths = await resizeImages(req.files);
//             imagesArray = resizedPaths.map(path => path.replace('public', ''));

//         }

//         const productData = await Product.findByIdAndUpdate({_id:req.body._id},
//         {$set: 
//             {
//                 name: req.body.name,
//                 description: req.body.description,
//                 price: req.body.price,
//                 category: categoryObjectIds,
//                 quantity: req.body.quantity,
//                 images: imagesArray
//             }
//         })
//         console.log('pdata', productData);
//         res.redirect('/admin/load-products?updatemsg=Product Updatad Successfully')
//     } catch (error) {
//         console.log(error.message);
//     }
// }


const categoryName =  async (req, res) => {
    const { categoryName } = req.params;

    try {
        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(404).send('Category not found');
        }

        // const products = await Product.find({ category: categoryName });
        const products = await Product.find({ categories: category._id})
                                      .populate('categories')
                                      .exec();
        res.render('admin/category', { products, categoryName });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products');
    }
};


const getAllProducts = async (req, res) => {
    try {
      const products = await Product.find(); 
      res.json(products); 
      console.log("details",products);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: 'Server error' });
    }
  };

  const getAllCategories = async (req, res) => {
    try {
      const categories = await Category.find(); 
      res.json(categories); 
      console.log("details",categories);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: 'Server error' });
    }
  }; 


const getSingleProduct = async(req, res) => {
    try {
        const productId = req.params.id
        const product = await Product.findById(productId)
        res.json(product)
    } catch (error) {
        console.log(error.message);
    }
}
  




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
//   createCategories,
  loadCategories,
  addCategory,
  editCategory,
  toggleCategoryStatus,
  updateCategory,
  categoryName,
//   activateCategory,
//   deactivateCategory,
  
  
};




// const verifyLogin = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         const userData = await User.findOne({ email: email });

//         if (userData) {
//             const passwordMatch = await bcrypt.compare(password, userData.password);

//             if (passwordMatch) {
//                 if (userData.is_admin === 1) {
//                     // Admin login
//                     req.session.user_id = userData._id;
//                     res.redirect('/admin/home'); // Redirect to admin home page
//                     console.log('Admin logged in');
//                 } else {
//                     // Regular user login
//                     req.session.user_id = userData._id;
//                     res.redirect('/home'); // Redirect to regular user home page
//                     console.log('User logged in');
//                 }
//             } else {
//                 // Incorrect password
//                 res.render('admin/login', { message: "Invalid credentials" });
//                 console.log('Invalid credentials1');
//             }
//         } else {
//             // User not found
//             res.render('admin/login', { message: "Invalid credentials" });
//             console.log('Invalid credentials2');
//         }
//     } catch (error) {
//         console.log(error.message);
//         res.render('login', { message: "Something went wrong" }); // Generic error message
//     }
// };




////

// product croppinfg

// try {
//     const { name, description, price, category, quantity } = req.body;
//     const slug = slugify(name, { lower: true });

//     // Resize and crop images before saving
//     const resizedImages = [];

//     for (const file of req.files) {
//         const resizedImageBuffer = await sharp(file.buffer)
//             .resize({ width: 800, height: 600, fit: 'cover' }) // Adjust dimensions as per your requirements
//             .toBuffer();

//         resizedImages.push({
//             url: `/admin/uploads/resized_${file.filename}`, // Adjust the path as needed
//             originalname: file.originalname,
//             mimetype: file.mimetype,
//             size: resizedImageBuffer.length // Optionally store the size of the image
//         });

//         // Save the resized image buffer to disk or cloud storage
//         // For example, you can use fs module to save to disk or upload to cloud storage like AWS S3
//         // fs.writeFileSync(`./public/uploads/resized_${file.filename}`, resizedImageBuffer);
//     }

//     const product = new Product({
//         name,
//         slug,
//         description,
//         price,
//         category,
//         quantity,
//         images: resizedImages // Save resized images instead of original ones
//     });

//     await product.save();
//     res.redirect('/admin/load-products');
// } catch (error) {
//     console.error('Error adding product:', error);
//     // Handle error appropriately
//     res.status(500).json({ error: 'Error adding product' });
// }
// };