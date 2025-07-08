const User = require('../models/usermodel')

const cleanupUnverifiedUsers = async () => {
  try {
    const result = await User.deleteMany({
      is_verified: 0,
      otpExpires: { $lt: Date.now() },
    });
    console.log(`Cleaned up ${result.deletedCount} unverified users`);
  } catch (error) {
    console.error("Error in cleanup:", error.message);
  }
};

module.exports = cleanupUnverifiedUsers;
