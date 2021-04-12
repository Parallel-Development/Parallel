const mongoose = require('mongoose');

const reqString = {
    type: 'String',
    required: true
}

const warningSchema = mongoose.Schema({
    userid: reqString,
    guildname: reqString,
    guildid: reqString,
    warnings: [Object]
})

module.exports = mongoose.model('warnings', warningSchema)