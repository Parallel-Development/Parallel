const mongoose = require('mongoose');

const reqString = {
    type: String,
    required: true
};

const reqBool = {
    type: Boolean,
    required: true
};

const reqStringArray = {
    type: [String],
    required: true
};

const settingsSchema = mongoose.Schema({
    guildname: reqString,
    guildID: reqString,
    prefix: reqString,
    baninfo: reqString,
    delModCmds: reqBool,
    locked: reqStringArray,
    autowarnexpire: reqString,
    manualwarnexpire: reqString,
    messageLogging: reqString,
    moderationLogging: reqString,
    automodLogging: reqString,
    modRoles: reqStringArray,
    shortcutCommands: {
        type: [Object],
        required: true
    },
    muterole: reqString,
    removerolesonmute: reqBool
});

module.exports = mongoose.model('settings', settingsSchema);
