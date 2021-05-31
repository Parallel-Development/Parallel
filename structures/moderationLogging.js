const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async(client, type, moderator, target, channel, reason, duration, code) => {
    const getModerationLogChannel = await settingsSchema.findOne({
        guildid: target.guild.id
    })

    let { moderationLogging } = getModerationLogChannel
    if(moderationLogging == 'none') return;
    if(!target.guild.channels.cache.get(moderationLogging)) {
        await settingsSchema.updateOne({
            guildid: target.guild.id
        },
        {
            moderationLogging: 'none'
        })
        return;
    }

    const modLog = new Discord.MessageEmbed()
    .setColor('#ffa500')
    .setAuthor('Razor Logging', client.user.displayAvatarURL())
    .setTitle(`User ${type}`)
    .addField('User', `**${target.user.tag}** - \`${target.id}\``, true)
    .addField('Moderator', `**${moderator.tag}** - \`${moderator.id}\``, true)
    .addField('Reason', reason, true)
    if(duration) modLog.addField('Duration', duration, true)
    modLog.addField('Punishment ID', code, true)
    modLog.addField(`${type} in`, channel, true)

    const modLogChannel = target.guild.channels.cache.get(moderationLogging);
    modLogChannel.send(modLog)
}