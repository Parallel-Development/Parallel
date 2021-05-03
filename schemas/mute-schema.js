const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}

const muteSchema = mongoose.Schema({
    guildname: reqString,
    guildid: reqString,
    userid: reqString,
    roles: {
        type: [String],
        required: true
    }
})

module.exports = mongoose.model('mutes', muteSchema)