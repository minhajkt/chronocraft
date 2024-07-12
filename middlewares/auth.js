const isLogin = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            console.log("User is logged in");
            next();
        } else {
            // console.log("User not logged in, redirecting to /home");
             return res.redirect('/home');
        }
    } catch (error) {
        console.log(error.message);
    }
}

const isLogout = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            // console.log("User is logged in, redirecting to /home");
            res.redirect('/home');
        } else {
            console.log("User not logged in");
            next();
        }
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    isLogin,
    isLogout,
};





// const isLogin = async(req, res, next)=>{
//     try {
//         if(req.session.user_id){
//             next()
//         }else{
//             res.redirect('/home')
//         }
//     } catch (error) {
//         console.log(error.message);
//     }
// }


// const isLogout = async(req, res, next)=>{
//     try {
//         if(req.session.user_id){
//             res.redirect('/home')
            
//         }else{
//             next()
//         }
//     } catch (error) {
//         console.log(error.message);
//     }
// }




// module.exports = {
//     isLogin,
//     isLogout,

// }