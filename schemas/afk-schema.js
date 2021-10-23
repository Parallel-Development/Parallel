const mongoose = require('mongoose');

const reqString = {
    type: String,
    required: true
};

const afkSchema = mongoose.Schema({
    guildname: reqString,
    guildID: reqString,
    afks: {
        type: [Object],
        required: true
    },
    allowedRoles: []
});

module.exports = mongoose.model('afks', afkSchema);
