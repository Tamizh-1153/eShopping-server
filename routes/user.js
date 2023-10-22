const express = require("express")
const router = express.Router()
const authenticateUser = require("../middleware/authentication")

const {
  login,
  register,
  forgotPassword,
  resetPassword,
  getUserInfo,
  getCartItems,
  updateCartItems,
  createCheckoutSession,
  webhook,
  getOrderedItems,
} = require("../controllers/user")

router.route("/login").post(login)
router.route("/register").post(register)
router.route("/forgot_password").post(forgotPassword)
router.route("/reset_password/:id/:token").post(resetPassword)
router.route("/user/info").get(authenticateUser, getUserInfo)
router.route("/user/orders").get(authenticateUser, getOrderedItems)
router.route("/user/cart").get(authenticateUser, getCartItems)
router.route("/user/updateCart").post(authenticateUser, updateCartItems)
router
  .route("/user/create-checkout-session")
  .post(authenticateUser, createCheckoutSession)
router
  .route("/stripe/webhook")
  .post(webhook)  

module.exports = router
