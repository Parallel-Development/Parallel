const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}

const reqBool = {
    type: Boolean,
    required: true
}

const settingsSchema = mongoose.Schema({
    guildname: reqString,
    guildid: reqString,
    prefix: reqString,
    baninfo: reqString,
    delModCmds: reqBool,
    locked: {
        type: [String],
        required: true
    },
    rmrolesonmute: reqBool,
    autowarnexpire: reqString,
})

module.exports = mongoose.model('settings', settingsSchema)
