const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}

const automodSchema = mongoose.Schema({
    guildname: reqString,
    guildid: reqString,
    filter: reqString,
    filterList: [String],
    fast: reqString,
    walltext: reqString,
    flood: reqString,
    links: reqString,
    invites: reqString,
    massmention: reqString,
    duration: reqString,
    rawDuration: reqString,
    bypassChannels: {
        type: [String],
        required: true
    }
});

module.exports = mongoose.model('automod', automodSchema)