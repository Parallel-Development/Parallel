const { string } = require('mathjs');
const mongoose = require('mongoose')

const reqString = {
    type: String,
    required: true
}

const reqInt = {
    type: Number,
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
    filterTempMuteDuration: reqInt,
    fastTempMuteDuration: reqInt,
    walltextTempMuteDuration: reqInt,
    linksTempMuteDuration: reqInt,
    invitesTempMuteDuration: reqInt,
    massmentionTempMuteDuration: reqInt,
    filterTempBanDuration: reqInt,
    fastTempBanDuration: reqInt,
    walltextTempBanDuration: reqInt,
    linksTempBanDuration: reqInt,
    invitesTempBanDuration: reqInt,
    massmentionTempBanDuration: reqInt,
    bypassChannels: {
        type: [String],
        required: true
    }
});

module.exports = mongoose.model('automod', automodSchema)
