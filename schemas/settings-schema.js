const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}

const settingsSchema = mongoose.Schema({
    guildname: reqString,
    guildid: reqString,
    prefix: reqString,
    baninfo: reqString,
    delModCmds: {
        type: Boolean,
        required: true
    },
    locked: {
        type: [String],
        required: true
    }
})

module.exports = mongoose.model('settings', settingsSchema)
