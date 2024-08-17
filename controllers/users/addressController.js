const User = require("../../models/usermodel");
const Address = require("../../models/addressModel");
const Cart = require("../../models/cartModel");
const bcrypt = require("bcryptjs");

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

const manageAddress = async (req, res) => {
  try {
    const userId = await req.session.user_id;

    const userData = await User.findById(userId);
    const addresses = await Address.find({ _id: { $in: userData.addresses } });

    if (userData) {
      res.render("users/manage-address", { userData, addresses });
    } else {
      res.redirect("/home");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const addAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { street, city, state, pincode } = req.body;
    const cart = await Cart.findOne({ userId });
    const userData = await User.findById({ _id: req.session.user_id });
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    const newAddress = new Address({
      street,
      city,
      state,
      pincode,
    });

    const savedAddress = await newAddress.save();

    userData.addresses.push(savedAddress);

    await userData.save();
    req.flash("success", "Address Adding Successful");

    let redirectUrl = req.headers.referer || "/manage-address";
    if (req.headers.referer && req.headers.referer.includes("/checkout")) {
      redirectUrl = "/checkout-address";
    }

    res.redirect(redirectUrl);
  } catch (error) {
    console.log(error.message);
  }
};

const getAddress = async (req, res) => {
  const userId = req.session.user_id;
  const addressId = req.params.addressId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const address = user.addresses.find(
      (addr) => addr._id.toString() === addressId
    );
    if (!address) {
      return res
        .status(404)
        .json({ success: false, error: "Address not found for the user" });
    }

    res.json({ success: true, address });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

const editAddress = async (req, res) => {
  const userId = req.session.user_id;
  const addressId = req.params.addressId;
  const { street, city, state, pincode } = req.body;

  try {
    const user = await User.findById(userId).populate("addresses");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const address = user.addresses.find(
      (addr) => addr._id.toString() === addressId
    );
    if (!address) {
      return res.status(404).json({ error: "Address not found for the user" });
    }

    address.street = street;
    address.city = city;
    address.state = state;
    address.pincode = pincode;

    const saved = await address.save();
    req.flash("success", "Address edited successfully");
    res.json({ success: true, message: "Address updated successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.body.id;

    const address = await Address.findByIdAndDelete(addressId);
    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    await User.updateMany(
      { addresses: addressId },
      { $pull: { addresses: addressId } }
    );

    // req.flash('success', 'Address deleted successfully');
    res.json({ success: true, message: "Address deleted successfully" });
    console.log("backedn address deletion success");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const getChangePassword = async (req, res) => {
  try {
    const userId = req.session.user_id;

    if (!userId) {
      res.status(400).json({ success: false, message: "User not found !" });
    }
    const userData = await User.findById(userId);
    if (!userData) {
      res
        .status(400)
        .json({ success: false, message: "UserData not found ! " });
    }

    res.render("users/change-password", { userData });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "An error Occured" });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    const userData = await User.findById(userId);

    if (!userData) {
      return res
        .status(400)
        .json({ success: false, message: "User data not found" });
    }

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const oldPasswordMatch = await bcrypt.compare(
      currentPassword,
      userData.password
    );

    if (!oldPasswordMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
    }

    if (newPassword !== confirmNewPassword) {
      return res
        .status(400)
        .json({ success: false, message: "New passwords do not match" });
    }

    const spassword = await securePassword(newPassword);

    userData.password = spassword;
    await userData.save();

    req.flash("success", "Password updated successfully");
    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

module.exports = {
  manageAddress,
  addAddress,
  getAddress,
  editAddress,
  deleteAddress,
  getChangePassword,
  changePassword,
};
