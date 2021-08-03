const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async (client, type, server, user, reason) => {

    const getAutomodLogChannel = await settingsSchema.findOne({
        guildid: server.id
    })

    const { automodLogging } = getAutomodLogChannel;

    if (automodLogging === 'none') return;
    
    if (!server.channels.cache.get(automodLogging)) {
        await settingsSchema.updateOne({
            guildid: server.id
        },
            {
                automodLogging: 'none'
            })
        return;
    }

    const expiredLog = new Discord.MessageEmbed()
        .setColor('#ffa500')
        .setAuthor('Parallel Logging', client.user.displayAvatarURL())
        .setTitle(`User automatically ${type}`)
        .addField('User', `**${user.tag}** - \`${user.id}\``, true)
        .addField('Reason', reason)

    const automodLogChannel = server.channels.cache.get(automodLogging);
    automodLogChannel.send({ embeds: [expiredLog] })
}