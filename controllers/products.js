const Products = require('../models/products')

const getAllProducts = async(req,res) => {
    const products = await Products.find()
    res.json({products})
}

const getProduct = async(req, res) => {
    const {id} = req.params
    const product = await Products.findOne({})
}

module.exports = {getAllProducts,getProduct}