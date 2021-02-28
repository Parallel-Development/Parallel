const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}

const blacklistSchema = mongoose.Schema({
    user: reqString,
    reason: reqString,
    date: reqString,
    sent: reqString
})

module.exports = mongoose.model('blacklist', blacklistSchema)