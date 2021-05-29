const mongoose = require('mongoose')
const mongoPath = 'mongodb+srv://Piyeris:UjmRwPjLiD3ILl6d@razor.ghfnk.mongodb.net/Razor?retryWrites=true&w=majority'

module.exports = async () => {
    await mongoose.connect(mongoPath, {
        keepAlive: true,
        useNewUrlParser: true,
        useUnifiedTopology: true
    })

    return mongoose
}