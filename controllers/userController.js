const User = require('../models/usermodel')
const bcrypt = require('bcryptjs')
const nodemailer = require('nodemailer')
const crypto = require('crypto')
const axios = require('axios')
const Product = require('../models/productmodel')
const Category = require('../models/categoryModel');  
// const {account,client} = require('../appwrite')
const dotenv = require('dotenv').config()
const passport = require('passport');
const { google } = require('googleapis');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const securePassword = async(password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
}


        const validateRegister = (name, email, password, confirm_password)=>{
            const nameRegex = /^[a-zA-Z]+[a-zA-Z\s]*[a-zA-Z]+$/;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const passwordRegex = /^\S{6,}$/;
            const confirmPasswordRegex = /^\S{6,}$/;
        

        if(!nameRegex.test(name)){
            return 'Invalid Name. Please Enter a Valid Name'
        }
        if(!emailRegex.test(email)){
            return 'Invalid Email. Please Enter a Valid Email'
        }
        if(!passwordRegex.test(password)){
            return 'Invalid Password. Password should have atleast 6 charecters and no whitespace'
        }
        if(!confirmPasswordRegex.test(confirm_password)){
                return 'Invalid Password. Password should have atleast 6 charecters and no whitespace'
        }
        return null;
    };


const sendVerifyMail = async(name,email,otp)=>{
    try {

        const transporter = nodemailer.createTransport({
            host:'smtp.gmail.com',
            port:587,
            secure: false,
            requireTLS: true,
            auth:{
                user:'minhajkt17@gmail.com',
                pass: 'gscr ioza isvo ovli'
            }
        })
        
        const mailoptions = {
            from:'minhajkt17@gmail.com',
            to: email,
            subject: 'For verification mail from ChronoCraft',
            html: `<p>Hello${name}. Please use this otp:${otp} to verify your email</p>`
        }

        await transporter.sendMail(mailoptions, function(error, info){
            if(error){
                console.log(error);
            }else{
                console.log('Email has been sent:- ', info.response)
            }
        })

    } catch (error) {
        console.log(error.message);
    }
}


passport.use(new GoogleStrategy({
    clientID: process.env.clientID,
    clientSecret: process.env.clientSecret,
    callbackURL: '/auth/google/callback' 
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({email: profile.emails[0].value})
        console.log('Google profile:', profile);

        if(user){
            
            console.log("user returened", user)
            return done(null,user)
        
            }else {
            user = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
                is_admin: 0,
                is_verified: 1,
                blocked: false,
            })
            await user.save()
            console.log('New user created:', user);
            return done(null,user)
        }
    }catch (error) {
        console.log(error.message);
        return done(error, null)
    }
    // return done(null, profile);
  }
));

// Serialize and deserialize user sessions (required by Passport)
passport.serializeUser((user, done) => {
    
  done(null, user.id);
  
});

passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });


const loadRegister = async(req, res) =>{
    try {
        res.render('users/registration')
    } catch (error) {
        console.log(error.message);
    }
}


const insertUser = async(req, res)=>{
    try {

        // const {name, email, password, confirm_password} = req.body

        // const errorMessage = validateRegister(name, email, password, confirm_password)

        // if(errorMessage){
        //     return res.render('users/registration', {msg: errorMessage})
        // }

        if(req.body.password !== req.body.confirm_password){
            return res.render('users/registration', {message: "Your passwords does not match"})}

        const spassword = await securePassword(req.body.password);
        const otp = crypto.randomInt(100000, 999999);
        const otpExpires = Date.now() + 60000;
        
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: spassword,
            is_admin: 0,
            otp: otp,
            otpExpires: otpExpires
        })

    const userData = await user.save()
    
    
    if(userData){ 
        await sendVerifyMail(req.body.name,req.body.email,otp)
        // res.redirect(`/verify-otp/`);
        res.render('users/otp-verification', {email: req.body.email, message: "User registration successful. Please Enter the OTP sent to your Registered Email for loggin in", otp:otp, otpExpires: otpExpires})
        // res.redirect('/login?succMsg=signup successfull...)
            // const msg = req.query.succMsg;

    }else {
        res.render('users/registration', {message: "User registration failed"})}
        
    } catch (error) {
        console.log(error.message);
    } }


// const insertUser = async(req, res) => {
//     try {
//         const { name, email, password, confirm_password } = req.body;
//         console.log("name",name);

//         if (password !== confirm_password) {
//             return res.status(400).json({ success: false, message: "Your passwords do not match" });
//         }

//         const spassword = await securePassword(password);
//         const otp = crypto.randomInt(100000, 999999);
//         const otpExpires = Date.now() + 60000;

//         const user = new User({
//             name,
//             email,
//             password: spassword,
//             is_admin: 0,
//             otp,
//             otpExpires
//         });

//         const userData = await user.save();
        

//         if (userData) {
//             await sendVerifyMail(name, email, otp);
//             console.log("data came");
//             return res.status(200).json({ success: true, message: "User registration successful. Please check your email for the OTP.", email, otpExpires });
//         } else {
//             console.log("data did  not come");
//             return res.status(500).json({ success: false, message: "User registration failed" });
//         }
//     } catch (error) {
//         console.log(error.message);
//         return res.status(500).json({ success: false, message: "Internal server error" });
//     }
// 

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

                res.render('users/otp-success', { otpExpires: user.otpExpires });
            } else {
                res.render('users/otp-verification', {
                    email: email,
                    message: 'Invalid or expired OTP. Please enter again.',
                    otp: otp,
                    otpExpires: user.otpExpires 
                });
            }
        } else {
            res.render('users/otp-resend', { message: 'User not found', email: email });
        }
    } catch (error) {
        console.log(error.message);
    }
}




    // const verifyOtp = async (req, res) => {
    //     try {
    //         const { email, otp } = req.body;
    
    //         // Check if it's a GET request or a POST request
    //         if (req.method === 'GET') {
    //             const user = await User.findOne({ email: req.query.email });
    
    //             if (user) {
    //                 return res.render('users/otp-verification', {
    //                     email: req.query.email,
    //                     message: '',
    //                     otpExpires: user.otpExpires
    //                 });
    //             } else {
    //                 return res.render('users/otp-resend', { message: 'User not found', email: req.query.email });
    //             }
    //         }
    
    //         // Handle POST request for OTP verification
    //         if (req.method === 'POST') {
    //             const user = await User.findOne({ email: email });
    
    //             if (user) {
    //                 if (user.otp === parseInt(otp) && user.otpExpires > Date.now()) {
    //                     user.otp = null;
    //                     user.otpExpires = null;
    //                     user.is_verified = 1;
    //                     await user.save();
    
    //                     return res.render('users/otp-success');
    //                 } else {
    //                     return res.render('users/otp-verification', {
    //                         email: email,
    //                         message: 'Invalid or expired OTP. Please enter again.',
    //                         otpExpires: user.otpExpires
    //                     });
    //                 }
    //             } else {
    //                 return res.render('users/otp-resend', { message: 'User not found', email: email });
    //             }
    //         }
    //     } catch (error) {
    //         console.log(error.message);
    //         res.render('users/otp-verification', {
    //             email: req.body.email || req.query.email,
    //             message: 'An error occurred during OTP verification.',
    //             otpExpires: null
    //         });
    //     }
    // };
    
 




const getOtpExpires = async (req, res) => {
    try {
        const { email } = req.query;
        const user = await User.findOne({ email: email });

        if (user) {
            const otpExpiresTimestamp = new Date(user.otpExpires).getTime(); 
            res.json({ otpExpires: otpExpiresTimestamp });
        } else {
            res.status(404).json({ message: 'User not found' });
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

            res.render('users/otp-verification', {
                email: user.email,
                message: 'OTP resent successfully. Please Enter the OTP sent to your Registered Email.',
                otpExpires: otpExpires
            });
        } else {
            res.render('users/otp-verification', { email: email, message: 'User not found' });
        }
    } catch (error) {
        console.log(error.message);
    }
}
    

const loadSuccess = (req, res) => {
            res.render('users/login',{otpsuccessmsg:'Your email has been successfully verified. You can now log in.'});
        }


const loadLogin = async(req, res) =>{
    try {
        const blockMsg = req.query.blockMsg
        res.render('users/login',{blockMsg})
        console.log("login loaded");
    } catch (error) {
        console.log(error.message);
    }
}    

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
                        res.json({ success: true });
                    } else {
                        res.json({ success: false, message: 'You are temporarily blocked.' });
                    }   
                } else {
                    res.json({ success: false, message: 'Please verify your Email before logging in' });
                }
            } else {
                res.json({ success: false, message: 'Invalid Login Credentials. Please try again' });
            }
        } else {
            res.json({ success: false, message: 'Invalid Login Credentials. Please try again' });
        }
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: 'An error occurred. Please try again.' });
    }
};


// const verifyLogin = async(req, res)=>{
//     try {
//         const email = req.body.email
//         const password = req.body.password

//         const userData = await User.findOne({email:email})
        
//         if(userData){
//           const passwordMatch = await bcrypt.compare(password, userData.password)
//           if(passwordMatch){
//             if(userData.is_verified){
//                 if(userData.blocked !== true){
//             req.session.user_id = userData._id;
//             res.json({ success: true });
//             // res.redirect('home')
//         }else{
//             res.json({ success: false, message: 'You are not an Admin.' });
//             // res.render('users/login',{message:'You are blocked temporarily. Please contact us for more details'})
//         }
//           }else{
//             res.json({ success: false, message: 'Invalid Login Credentials. Please' });
//             // res.render('users/login',{message: "Please verify your Email before logging in"})
//           }  
//         }else{
//             res.json({ success: false, message: 'Invalid Login Credentials. try again' });
//             // res.render('users/login',{message: "Invalid login credentials"})
//             }
//         }else{
//             res.json({ success: false, message: 'Invalid Login Credentials.again' });
//             // res.render('users/login',{message: "Invalid login credentials"})
//         }  
//     } catch (error) {
//         console.log(error.message);
//     }
// }

const loadHomePage = async(req,res)=>{
    try {
        const response = await axios.get('http://localhost:3000/admin/all-products');
        const products = response.data.filter(product => product.active)
        const categoryResponse = await axios.get('http://localhost:3000/admin/all-categories');
        const categories = categoryResponse.data.filter(category => category.active)
        res.render('home',{products, categories});
        // console.log();
        console.log("heelo");
        console.log("seesion6665"+req.user);
        console.log("correct"+req.session.user_id);
        console.log("correct"+req.session.user);
    } catch (error) {
        console.log(error.message)
    }
}

const loadHome = async(req, res) => {
    try {
        const userData = await User.findOne({_id:req.session.user_id})
        const response = await axios.get('http://localhost:3000/admin/all-products');
        const categoryResponse = await axios.get('http://localhost:3000/admin/all-categories');
        const products = response.data.filter(product => product.active)
        const categories = categoryResponse.data.filter(category => category.active)
        // const categories = await Category.find();
        if (userData) {
           
            res.render('home', { message: "Login success", user: userData,categories,products });
            console.log('Home is loaded');
        } else {
            
            res.redirect('/login'); 
        }
        // res.render('home', {message:"login success"})
        // console.log('home is loaded');
    } catch (error) {
        console.log(error.message);
    }
}






const loadProducts = async (req, res) => {
    console.log("Fetching products from admin before...");

    try {
    console.log("Fetching products from admin...");
    const response = await axios.get('http://localhost:3000/admin/all-products');
    const categoryResponse = await axios.get('http://localhost:3000/admin/all-categories'); 
    console.log("response got", response.data);
    const products = response.data.filter(product => product.active)
    const categories = categoryResponse.data.filter(category => category.active)
    console.log('Products that will be displayed in shop are :', products);
    res.render('users/viewproducts', { products, categories });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error fetching products' });
  }
};

const loadShop = async(req,res)=> {
    try {
        // const userData = await User.findOne({_id:req.session.user_id})
        // if (userData) {
            const response = await axios.get('http://localhost:3000/admin/all-products');
            const categoryResponse = await axios.get('http://localhost:3000/admin/all-categories');
            const products = response.data.filter(product => product.active)
            const categories = categoryResponse.data.filter(category => category.active)
            console.log('shop for user is loaded');
            return res.render('users/shop', { products, categories })
        // }else{
            // console.log("Data not found");
            // res.redirect('/')
        // }
    } catch (error) {
        console.log(error.message);
    }
}

const categoryProducts = async (req, res) => {
    const { categoryName } = req.params;

    try {
        const category = await Category.findOne({ name: categoryName });

        if (!category) {
            return res.status(404).send('Category not found');
        }

        const products = await Product.find({ categories: category._id })
                                      .populate('categories')
                                      .exec();

        res.render('users/cat', { products, categoryName });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products');
    }
};


const loadProductDetails = async(req,res)=> {
    try {
        const products = await Product.find();
        const productId = req.params.id
        const response = await axios.get(`http://localhost:3000/admin/product/${productId}`)
        const product = response.data
        console.log("data response is :     ", product);
        console.log("respone.dartta is :: ", response.data);

        if(!product || !product.active){
            console.log('Product not found');
            return res.redirect('/users/shop')
        }
        res.render('users/product-details',{product,products})
    } catch (error) {
        console.log(error.message);
    }
}


const userLogout = async(req,res)=> {
    try {
        const blockMsg = req.query.blockMsg
        req.session.destroy();
        console.log("seesion6665"+req.user);
        res.render('users/login', {messageLogout: 'Logged out Successfully', blockMsg})
    } catch (error) {
        console.log(error.message);
    }
}

const contactDetails = async(req,res)=>{
    res.render('users/contact-us')
}


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
    contactDetails
}



