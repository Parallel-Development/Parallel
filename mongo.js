const mongoose = require('mongoose')
const mongoPath = 'mongodb+srv://Piyeris:dsqZ5xx34CVXWtb@razor.ghfnk.mongodb.net/Razor?retryWrites=true&w=majority'

module.exports = async () => {
    await mongoose.connect(mongoPath, {
        keepAlive: true,
        useNewUrlParser: true,
        useUnifiedTopology: true
    })

    return mongoose
}