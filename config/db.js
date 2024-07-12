const mongoose = require('mongoose')

const connectdb = async() =>{
try {
    await mongoose.connect(process.env.MONGODB_URL)
    console.log("DB is connected");
} catch (error) {
    console.error("Connection failed", error)
}
}

module.exports = connectdb;