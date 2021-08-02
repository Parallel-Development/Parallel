const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}


const punishmentSchema = mongoose.Schema({
    guildname: reqString,
    guildID: reqString,
    type: reqString,
    userID: reqString,
    reason: reqString,
    expires: reqString,
    date: reqString
})

module.exports = mongoose.model('punishments', punishmentSchema)