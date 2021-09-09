const mongoose = require('mongoose');

const reqString = {
    type: 'String',
    required: true
}

const warningSchema = mongoose.Schema({
    guildname: reqString,
    guildID: String,
    guildid: String,
    userid: String,
    warnings: [Object]
})

module.exports = mongoose.model('warnings', warningSchema)