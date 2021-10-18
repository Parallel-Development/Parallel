const mongoose = require('mongoose');

const reqString = {
    type: String,
    required: true
};

const tagSchema = mongoose.Schema({
    guildname: reqString,
    guildID: reqString,
    allowedRoleList: {
        type: [String],
        required: true
    },
    tags: {
        type: [Object],
        required: true
    }
});

module.exports = mongoose.model('tags', tagSchema);
