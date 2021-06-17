const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async(client, type, moderator, rawTarget, channel, reason, duration, code) => {
    
    const target = await client.users.fetch(rawTarget.id)
    const getModerationLogChannel = await settingsSchema.findOne({
        guildid: moderator.guild.id
    })

    let { moderationLogging } = getModerationLogChannel
    if(moderationLogging == 'none') return;
    if(!moderator.guild.channels.cache.get(moderationLogging)) {
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
    .setAuthor('Razor Logging', client.user.displayAvatarURL())
    .setTitle(`User ${type}`)
    .addField('User', `**${target.tag}** - \`${target.id}\``, true)
    .addField('Moderator', `**${moderator.user.tag}** - \`${moderator.id}\``, true)
    .addField('Reason', reason, true)
    if(duration) modLog.addField('Duration', duration, true)
    modLog.addField('Punishment ID', code, true)
    modLog.addField(`${type} in`, channel, true)

    const modLogChannel = moderator.guild.channels.cache.get(moderationLogging);
    modLogChannel.send(modLog)
}
