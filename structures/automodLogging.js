const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async (client, type, target, channel, reason, duration, code) => {

    const getAutomodLogChannel = await settingsSchema.findOne({
        guildid: target.guild.id
    })

    let { automodLogging } = getAutomodLogChannel
    if (automodLogging == 'none') return;
    if (!target.guild.channels.cache.get(automodLogging)) {
        await settingsSchema.updateOne({
            guildid: target.guild.id
        },
            {
                automodLogging: 'none'
            })
        return;
    }

    const automodLog = new Discord.MessageEmbed()
        .setColor('#ffa500')
        .setAuthor('Parallel Logging', client.user.displayAvatarURL())
        .setTitle(`User automatically ${type}`)
        .addField('User', `**${target.user.tag}** - \`${target.id}\``, true)
        .addField('Reason', reason)
    if (duration) automodLog.addField('Duration', duration)
    automodLog.addField('Punishment ID', code, true)
    automodLog.addField(`${type} in`, channel, true)

    const automodLogChannel = target.guild.channels.cache.get(automodLogging);
    automodLogChannel.send(automodLog)
}
