const jwt = require("jsonwebtoken")

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.json("Authentication invalid")
  }

  const token = authHeader.split(" ")[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    //console.log(payload)
    req.user = { userId: payload.userId, email: payload.email, name: payload.name }
    next()
  } catch (err) {
    return res.json("Authentication invalid")
  }
}

module.exports = auth
