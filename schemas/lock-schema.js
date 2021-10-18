const mongoose = require('mongoose');

const reqString = {
    type: String,
    required: true
};

const lockSchema = mongoose.Schema({
    guildname: reqString,
    guildID: reqString,
    channels: {
        type: [Object],
        required: true
    }
});

module.exports = mongoose.model('locks', lockSchema);
