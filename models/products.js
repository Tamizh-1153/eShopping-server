const mongoose = require('mongoose')

const productsSchema = new mongoose.Schema({
    title:{
        type:String
    },
    price:{
        type:Number
    },
    description:{
        type:String
    },
    category:{
        type:String
    },
    image:{
        type:String
    },
    rating:{
        rate:{
            type:Number
        },
        count:{
            type:Number
        }
    }

})

module.exports = mongoose.model('Products',productsSchema)