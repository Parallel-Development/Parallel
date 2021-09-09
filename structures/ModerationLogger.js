const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

class ModerationLogger {

    constructor(client, type, moderator, target, channel, { reason, duration, punishmentID } = {}) {

        if (!client) throw new Error('required argument `client` is missing');
        if (!type) throw new Error('required argument `user` is missing');
        if (!moderator) throw new Error('required argument `moderator` is missing');
        if (!target) throw new Error('required argument `target` is missing');
        if (!channel) throw new Error('required argument `channel` is missing');
        if (typeof type !== 'string') throw new Error('type must be a string');
        if (typeof moderator !== 'object') throw new Error('moderator must be a object');
        if (typeof target !== 'object') throw new Error('target must be a object');
        if (typeof channel !== 'object') throw new Error('channel must be a object');
        if (reason && typeof reason !== 'string') throw new Error('reason must be a string');

        const main = async() => {
            const user = await client.users.fetch(target.id);

            const settings = await settingsSchema.findOne({
                guildID: moderator.guild.id
            })

            const { moderationLogging } = settings;
            if (moderationLogging === 'none') return;
            if (!moderator.guild.channels.cache.get(moderationLogging)) {
                await settingsSchema.updateOne({
                    guildID: moderator.guild.id
                },
                    {
                        moderationLogging: 'none'
                    })
                return;
            }

            const modLog = new Discord.MessageEmbed()
                .setColor('#ffa500')
                .setAuthor('Parallel Logging', client.user.displayAvatarURL())
                .setTitle(`User ${type}`)
                .addField('User', `**${user.tag}** - \`${user.id}\``, true)
                .addField('Moderator', `**${moderator.user.tag}** - \`${moderator.id}\``, true)
                .addField('Reason', reason.length <= 1024 ? reason : await client.util.createBin(reason))
            if (duration && duration !== 'Permanent') modLog.addField('Duration', client.util.duration(duration), true)
            if (duration && duration !== 'Permanent') modLog.addField('Expires', client.util.timestamp(Date.now() + duration), true)
            modLog.addField('Punishment ID', punishmentID, true)
            modLog.addField(`${type} in`, channel.toString(), true)

            const modLogChannel = moderator.guild.channels.cache.get(moderationLogging);
            modLogChannel.send({ embeds: [modLog] }).catch(() => { })
        }

        return main();
    }
}

module.exports = ModerationLogger;
