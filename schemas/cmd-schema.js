const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}

const cmdSchema = mongoose.Schema({
    guildname: reqString,
    guildid: reqString,
    locked: Array
})

module.exports = mongoose.model('cmd', cmdSchema)