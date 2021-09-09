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
    date: reqString,
    roles: {
        type: [String],
        required: true
    }
})

module.exports = mongoose.model('punishments', punishmentSchema)