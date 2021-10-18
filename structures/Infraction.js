const warningSchema = require('../schemas/warning-schema');

class Infraction {
    constructor(client, type, message, moderator, member, { reason, punishmentID, time, auto = false } = {}) {
        if (!client) throw new Error("required argument 'client' is missing");
        if (!type) throw new Error("required argument 'type' is missing");
        if (typeof type !== 'string') throw new TypeError("argument 'type' must be type string");
        if (!message) throw new Error("required argument 'message' is missing");
        if (typeof message !== 'object') throw new TypeError("argument 'message' must be an object");
        if (!member) throw new Error("required argument 'member' is missing");
        if (typeof member !== 'object') throw new TypeError("argument 'member' must be an object");
        if (!reason) throw new Error("required argument 'reason' is missing");
        if (typeof reason !== 'string') throw new TypeError("argument 'message' must be a string");

        const main = async () => {
            await warningSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    $push: {
                        warnings: {
                            userID: member.id,
                            type: type,
                            moderatorID: moderator.id,
                            date: client.util.timestamp(),
                            reason: reason,
                            duration: time && time !== 'Permanent' ? client.util.duration(time) : 'Permanent',
                            expires: time && time !== 'Permanent' ? Date.now() + time : 'Never',
                            punishmentID: punishmentID,
                            auto: auto ? true : false
                        }
                    }
                }
            );

            return true;
        };

        return main();
    }
}

module.exports = Infraction;
