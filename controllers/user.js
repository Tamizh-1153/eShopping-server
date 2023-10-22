const { response } = require("express")
const User = require("../models/user")
const Products = require("../models/products")
var nodemailer = require("nodemailer")
require("dotenv").config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

const register = async (req, res) => {
  const { email } = req.body

  const userExists = await User.findOne({ email })
  if (userExists) {
    return res.json({ message: "User already exists" })
  }

  const user = await User.create({ ...req.body })
  res.json({ message: "Registered successfully", user: { name: user.name } })
}

const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.json({ message: "Please provide a valid email and password" })
  }

  const user = await User.findOne({ email })
  if (!user) {
    return res.json({ message: "User not found" })
  }

  const isPasswordCorrect = await user.comparePassword(password)
  if (!isPasswordCorrect) {
    return res.json({ message: "Incorrect Password" })
  }

  const token = user.generateJWT()
  res.json({
    message: "Logged in successfully",
    user: { name: user.name },
    token,
  })
}

const forgotPassword = async (req, res) => {
  const { email } = req.body
  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.json({ message: "User not found" })
    }

    const token = user.generateJWT()
    await User.findOneAndUpdate({ email }, { token: token })
    const resetLink = `${process.env.FRONTEND_URL}/reset_password/${user._id}/${token}`

    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
    })

    var mailOptions = {
      from: "youremail@gmail.com",
      to: email,
      subject: "Password reset ",
      text: resetLink,
    }

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error)
      } else {
        console.log("Email sent: " + info.response)
      }
    })

    res.json({ message: "Reset link sent successfully", resetLink })
  } catch (err) {
    res.send(err)
  }
}

const resetPassword = async (req, res) => {
  const { id, token } = req.params
  const { password } = req.body

  const user = await User.findOne({ _id: id })

  if (!user) {
    return res.status(404).json({ message: "User not found" })
  }
  if (user.token != token) {
    return res.status(404).json({ message: "Invalid token" })
  }
  console.log(user)
  user.password = password
  user.token = ""
  await user.save()
  res.json({ message: "password reset success", success: true })
}

const getUserInfo = async (req, res) => {
  try {
    res.json({ user: req.user })
  } catch (error) {
    res.json(error)
  }
}

const getCartItems = async (req, res) => {
  const { email } = req.user
  try {
    const user = await User.findOne({ email })
    res.json({ message: "success", cart: user.cartItems })
  } catch (error) {
    res.json(error)
  }
}

const updateCartItems = async (req, res) => {
  const { email } = req.user
  const { cartItems } = req.body
  try {
    const user = await User.findOneAndUpdate(
      { email },
      { cartItems: cartItems },
      { new: true }
    )

    res.json({ message: "success", cart: user.cartItems })
  } catch (error) {
    res.json(error)
  }
}

const createCheckoutSession = async (req, res) => {
  const productIds = req.body.cartItems.map((item) => item.id)
  const products = await Products.find({ id: { $in: productIds } })

  const customer = await stripe.customers.create({
    metadata: {
      userId: req.body.user.userId,
      email: req.body.user.email,
    },
    
  })

  const line_items = req.body.cartItems.map((cartItem) => {
    let product = products.find((prod) => prod._id == cartItem._id)
    return {
      price_data: {
        currency: "inr",
        product_data: {
          name: product.title,
        },
        unit_amount: product.price * 100,
      },
      quantity: cartItem.amount,
    }
  })

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: line_items,
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["IN"],
      },
      customer: customer.id,
    })
    res.json({ url: session.url })
  } catch (error) {
    res.json(error.message)
  }
}

const webhook = async (request, response) => {
  const sig = request.headers["stripe-signature"]

  let event

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.endpointSecret)
    console.log(event.type);
  } catch (err) {
    console.log(err.message)
    response.status(400).send(`Webhook Error: ${err.message}`)
    return
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object
    console.log(session);
    
    const {line_items} = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items"],
    })

    stripe.customers
      .retrieve(session.customer)
      .then(async (customer) => {
        const user = await User.findOneAndUpdate(
          { email: customer.email },
          {
            $push: {
              order: {
                orderedItems: line_items.data,
                paid: session.amount_total/100,
                status: "ordered",
              },
            },
            cartItems: [],
          },
          { new: true }
        )
        console.log(user);
      })
  }
    response.send()
}

const getOrderedItems = async (req, res) => {
  const { email } = req.user
  try {
    const user = await User.findOne({ email })
    res.json({ message: "success", orders: user.order })
  } catch (error) {
    res.json(error)
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getUserInfo,
  getCartItems,
  updateCartItems,
  createCheckoutSession,
  webhook,
  getOrderedItems
}

// req.body.cartItems.map(async (item) => {
//   const product = await Products.findOne({ id: item.id })
//   return {
//     price_data: {
//       currency: "usd",
//       product_data: {
//         name: product.title,
//       },
//       unit_amount: product.price * 100,
//     },
//     quantity: item.amount,
//   }
// })
