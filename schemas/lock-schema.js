const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}

const reqArray = {
    type: [String],
    required: true
}

const lockSchema = mongoose.Schema({
    guildname: reqString,
    guildid: reqString,
    channelid: reqString,
    neutralOverwrites: reqArray,
    enabledOverwrites: reqArray,
})

module.exports = mongoose.model('locks', lockSchema)