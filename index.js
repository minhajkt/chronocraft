const express = require('express')
const path = require('path')
const session = require('express-session')
const connectdb = require('./config/db')
const userRoute = require('./routes/userRoute')
const bodyParser = require('body-parser')
const adminRoute = require('./routes/adminRoute')
const {setLoginStatus} = require('./middlewares/auth')
// const ProductRoute = require('./routes/productRoute')
const passport = require('passport');
const flash = require('connect-flash')

const app = express()
const nocache = require('nocache')

app.use(nocache())
const dotenv = require('dotenv').config()
const port = 3000 || process.env.PORT 


connectdb();



app.use(session({
    secret: 'secretKey',
    saveUninitialized: true,
    resave: false,
}))

app.use(flash())

app.use((req,res,next)=>{
    res.locals.success = req.flash('success')
    res.locals.error = req.flash('error')
    next()
})


app.use(setLoginStatus)


app.use(passport.initialize());
app.use(passport.session());

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(express.static(path.join(__dirname,'public')))

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use('/',userRoute)

app.use('/admin', adminRoute)


// app.use('/admin/product', ProductRoute)

app.listen(port, ()=>{
    console.log(`You are listenting to port ${port}`);
})