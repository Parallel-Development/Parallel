const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}

const punishmentSchema = mongoose.Schema({
    guildname: reqString,
    guildid: reqString,
    type: reqString,
    userID: reqString,
    duration: reqString,
    reason: reqString,
    expires: reqString
})

module.exports = mongoose.model('punishments', punishmentSchema)