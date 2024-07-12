const express = require('express')
const user_route = express.Router()
const auth = require('../middlewares/auth')
const passport = require('passport');

const userController = require('../controllers/userController')


user_route.get('/register',auth.isLogout, userController.loadRegister);
user_route.post('/register',userController.insertUser);

user_route.get('/verify-otp', userController.verifyOtp)
user_route.post('/verify-otp',userController.verifyOtp)

user_route.get('/success',userController.loadSuccess)

user_route.get('/resend-otp',userController.resendOtp);
user_route.post('/resend-otp',userController.resendOtp);

user_route.get('/otp-resend',userController.resendOtp)

user_route.get('/get-otp-expires', userController.getOtpExpires);

user_route.get('/',userController.loadHomePage)
user_route.post('/',userController.verifyLogin)

user_route.get('/login',auth.isLogout, userController.loadLogin)
user_route.post('/login',userController.verifyLogin)

user_route.get('/home', userController.loadHomePage)


user_route.get('/logout', auth.isLogin, userController.userLogout)

user_route.get('/viewproducts',userController.loadProducts)

user_route.get('/shop',userController.loadShop)

user_route.get('/product/:id', userController.loadProductDetails)

user_route.get('/category/:categoryName', userController.categoryProducts)

user_route.get('/contact-us',userController.contactDetails)


user_route.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));
    

    user_route.get('/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/login' }),
        async(req,res)=>{
        try {
            const user = req.user
            if(user.blocked){
                return res.redirect('/login?blockMsg=You are temporarily blocked')
            }
            req.session.user_id = req.user;
            res.redirect('/home');  
            
        } catch (error) {
            console.log(error.message);
        }
    });
        

module.exports = user_route

