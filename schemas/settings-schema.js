const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}

const reqBool = {
    type: Boolean,
    required: true
}

const reqStringArray = {
    type: [String],
    required: true
}

const settingsSchema = mongoose.Schema({
    guildname: reqString,
    guildid: reqString,
    prefix: reqString,
    baninfo: reqString,
    delModCmds: reqBool,
    locked: reqStringArray,
    rmrolesonmute: reqBool,
    autowarnexpire: reqString,
    messageLogging: reqString,
    modRoles: reqStringArray,
})

module.exports = mongoose.model('settings', settingsSchema)