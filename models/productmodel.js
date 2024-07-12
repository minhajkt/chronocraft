const mongoose = require('mongoose'); // Erase if already required
const Schema = mongoose.Schema

const productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    description:{
        type:String,
        required:true,
    },
    price:{
        type:Number,
        required:true,
    },
    quantity: {
        type: Number,
        required: true
    },
    // sold: {
    //     type: Number,
    //     default: 0,
    // },
    images: [{
        type: String,
        required: true
    }],
    active: {
        type: Boolean,
        default: true
      },
    categories: [
        { type: Schema.Types.ObjectId, ref: 'Category',
        required: true }
    ],
    // ratings: [
    //     {
    //     star: Number,
    //     postedby: {type:mongoose.Schema.Types.ObjectId, ref:"User"}
    //     },
    // ],
},
    {timestamps: true}
);


module.exports = mongoose.model('Product', productSchema);