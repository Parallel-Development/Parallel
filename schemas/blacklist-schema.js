const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}

const blacklistSchema = mongoose.Schema({
    ID: reqString,
    reason: reqString,
    date: reqString,
    sent: {
        type: Boolean,
        required: true
    },
    server: {
        type: Boolean,
        required: true
    }
})

module.exports = mongoose.model('blacklist', blacklistSchema)