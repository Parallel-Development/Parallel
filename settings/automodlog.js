const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async (client, message, args) => {
    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1])
    if (args[1] === 'none') {
        await settingsSchema.updateOne({
            guildID: message.guild.id,
        },
            {
                automodLogging: 'none'
            })

        return message.reply(`Success! Automod instances will no longer be logged`)

    }
    if (!channel) return message.reply(client.config.errorMessages.missing_argument_channel);
    if (channel.type !== 'GUILD_TEXT') return message.reply(client.config.errorMessages.not_channel_type_txxt);

    if (!channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) {
        return message.reply('I cannot send messages in this channel! Please give me permission to send messages here and run again')
    }

    await settingsSchema.updateOne({
        guildID: message.guild.id,
    },
        {
            automodLogging: channel.id
        }
    )

    message.reply(`Success! Automod instances will now be logged in ${channel}`)
}