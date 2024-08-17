const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        enum: [
          "Yet to be Delivered",
          "Shipped",
          "Delivered",
          "Cancelled",
          "Returned",
        ],
        default: "Yet to be Delivered",
      },
    },
  ],
  totalPrice: { type: Number, required: true },
  coupon: { type: Schema.Types.ObjectId, ref: "Coupon" },
  paymentMethod: { type: String, required: true },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  status: {
    type: String,
    enum: [
      "Yet to be Delivered",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Returned",
    ],
    default: "Yet to be Delivered",
  },
  paymentStatus: {
    type: String,
    enum: ["Completed", "Pending"],
  },
  razorpayOrderId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
