const punishmentSchema = require('../schemas/punishment-schema');
const moment = require('moment');

exports.run = async(guildname, guildID, type, userID, reason, expires) => {
    return await new punishmentSchema({
        guildname: guildname,
        guildID: guildID,
        type: type,
        userID: userID,
        reason: reason,
        expires: expires,
        date: `<t:${Date.now()}>`
    }).save();
}
