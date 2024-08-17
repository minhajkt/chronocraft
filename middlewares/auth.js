const isLogin = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      console.log("User is logged in");
      next();
    } else {
      return res.redirect("/home");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const isLogout = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      res.redirect("/home");
    } else {
      console.log("User not logged in");
      next();
    }
  } catch (error) {
    console.log(error.message);
  }
};

const setLoginStatus = (req, res, next) => {
  res.locals.isLoggedIn = !!req.session.user_id;
  next();
};

module.exports = {
  isLogin,
  isLogout,
  setLoginStatus,
};
