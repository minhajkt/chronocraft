const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, unique: true },
    password: { type: String },
    is_admin: { type: Number, default: 0 },
    is_verified: { type: Number, default: 0 },
    mobile: { type: Number },
    otp: { type: Number },
    otpExpires: { type: Date },
    blocked: { type: Boolean, default: false },
    googleId: { type: String, unique: true, sparse: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    addresses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Address" }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    wallet: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
