const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async (client, type, moderator, target, channel, reason, duration, punishmentID) => {

    const user = await client.users.fetch(target.id);

    const settings = await settingsSchema.findOne({
        guildID: moderator.guild.id
    })

    const { moderationLogging } = settings;
    if (moderationLogging === 'none') return;
    if (!moderator.guild.channels.cache.get(moderationLogging)) {
        await settingsSchema.updateOne({
            guildid: moderator.guild.id
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
        .addField('Reason', reason.length < 1500 ? reason : await client.util.createBin(reason))
    if (duration && duration !== 'Permanent') modLog.addField('Duration', client.util.convertMillisecondsToDuration(duration), true)
    if (duration && duration !== 'Permanent') modLog.addField('Expires', client.util.timestamp(Date.now() + duration), true)
    modLog.addField('Punishment ID', punishmentID, true)
    modLog.addField(`${type} in`, channel, true)

    const modLogChannel = moderator.guild.channels.cache.get(moderationLogging);
    modLogChannel.send({ embeds: [modLog] }).catch(() => { })
}
