const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}

const settingsSchema = mongoose.Schema({
    guildname: reqString,
    guildid: reqString,
    prefix: reqString,
    logs: reqString,
    baninfo: reqString
})

module.exports = mongoose.model('settings', settingsSchema)
