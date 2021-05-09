const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}

const reqObject = {
    type: [String],
    required: true
}

const lockSchema = mongoose.Schema({
    guildname: reqString,
    guildid: reqString,
    neutralOverwrites: reqObject,
    enabledOverwrites: reqObject
})

module.exports = mongoose.model('locks', lockSchema)