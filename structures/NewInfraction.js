const warningSchema = require('../schemas/warning-schema');

exports.run = async (client, type, message, member, reason, punishmentID, time, auto = false) => {

    if (!type) throw new Error('required argument \'type\' is missing');
    if (typeof type !== 'string') throw new TypeError('argument \'type\' must be type string');
    if (!message) throw new Error('required argument \'message\' is missing');
    if (typeof message !== 'object') throw new TypeError('argument \'message\' must be an object');
    if (!member) throw new Error('required argument \'member\' is missing');
    if (typeof member !== 'object') throw new TypeError('argument \'member\' must be an object');
    if (!reason) throw new Error('required argument \'reason\' is missing');
    if (typeof reason !== 'string') throw new TypeError('argument \'message\' must be a string');

    const findGuild = await warningSchema.findOne({
        guildID: message.guild.id
    })

    if (!findGuild) {
        await new warningSchema({
            guildname: message.guild.name,
            guildID: message.guild.id,
            warnings: []
        }).save();
    }

    await warningSchema.updateOne({
        guildID: message.guild.id,
    },
        {
            $push: {
                warnings: {
                    userID: member.id,
                    type: type,
                    moderatorID: message.author.id,
                    date: client.util.timestamp(),
                    reason: reason,
                    duration: time && time !== 'Permanent' ? client.util.convertMillisecondsToDuration(time) : 'Permanent',
                    expires: time && time !== 'Permanent' ? Date.now() + time : 'Never',
                    punishmentID: punishmentID,
                    auto: auto ? true : false
                }
            }
        })

    return true;

}
