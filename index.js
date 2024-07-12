const express = require('express')
const path = require('path')
const session = require('express-session')
const connectdb = require('./config/db')
const userRoute = require('./routes/userRoute')
const bodyParser = require('body-parser')
const adminRoute = require('./routes/adminRoute')

const ProductRoute = require('./routes/productRoute')
const passport = require('passport');

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


app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))

app.use(express.static(path.join(__dirname,'public')))

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use('/',userRoute)

app.use('/admin', adminRoute)

// app.use('/admin/product', ProductRoute)

app.listen(port, ()=>{
    console.log(`You are listenting to port ${port}`);
})