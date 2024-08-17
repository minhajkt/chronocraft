const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const couponSchema = new Schema({
  code: { type: String, required: true, unique: true },
  discountType: {
    type: String,
    enum: ["percentage", "amount"],
    required: true,
  },
  discountValue: { type: Number, required: true },
  expirationDate: { type: Date, required: true },
  usageLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  minimumCartValue: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

couponSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Coupon", couponSchema);
