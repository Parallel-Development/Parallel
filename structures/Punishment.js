const punishmentSchema = require('../schemas/punishment-schema');

class Punishment {
    constructor(guildname, guildID, type, userID, { reason, time, roles } = {}) {
        if (!guildname) throw new Error('required argument `guildname` is missing');
        if (!guildID) throw new Error('required argument `guildID` is missing');
        if (!type) throw new Error('required argument `guildname` is missing');
        if (!userID) throw new Error('required argument `guildname` is missing');
        if (typeof guildname !== 'string') throw new Error('guildname must be a string');
        if (typeof guildID !== 'string') throw new Error('guildID must be a string');
        if (typeof type !== 'string') throw new Error('type must be a string');
        if (typeof userID !== 'string') throw new Error('userID must be a string');

        const main = async () => {
            return new punishmentSchema({
                guildname: guildname,
                guildID: guildID,
                type: type,
                userID: userID,
                reason: reason,
                expires: time,
                date: `<t:${Math.floor(Date.now() / 1000)}>`,
                roles: roles
            }).save();
        };

        if (type === 'mute') delete global.notMutedUsers[userID];

        return main();
    }
}

module.exports = Punishment;
