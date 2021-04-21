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
    filterTempMuteRawDuration: reqString,
    fastTempMuteDuration: reqInt,
    fastTempMuteRawDuration: reqString,
    walltextTempMuteDuration: reqInt,
    walltextTempMuteRawDuration: reqString,
    linksTempMuteDuration: reqInt,
    linksTempMuteRawDuration: reqString,
    invitesTempMuteDuration: reqInt,
    invitesTempMuteRawDuration: reqString,
    massmentionTempMuteDuration: reqInt,
    massmentionTempMuteRawDuration: reqString,
    filterTempBanDuration: reqInt,
    filterTempBanRawDuration: reqString,
    fastTempBanDuration: reqInt,
    fastTempBanRawDuration: reqString,
    walltextTempBanDuration: reqInt,
    walltextTempBanRawDuration: reqString,
    linksTempBanDuration: reqInt,
    linksTempBanRawDuration: reqString,
    invitesTempBanDuration: reqInt,
    invitesTempBanRawDuration: reqString,
    massmentionTempBanDuration: reqInt,
    massmentionTempBanRawDuration: reqString,
    bypassChannels: {
        type: [String],
        required: true
    }
});

module.exports = mongoose.model('automod', automodSchema)
