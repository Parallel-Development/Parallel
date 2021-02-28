const mongoose = require('mongoose');

const reqString = {
    type: 'String',
    required: true
}

const warningSchema = mongoose.Schema({
    guildname: reqString,
    guildid: reqString,
    type: reqString,
    userid: reqString,
    reason: reqString,
    code: reqString,
    date: reqString
})

module.exports = mongoose.model('warnings', warningSchema)