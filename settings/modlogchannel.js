const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async (client, message, args) => {

    if (args[1] === 'none') {
        await settingsSchema.updateOne({
            guildID: message.guild.id,
        },
            {
                moderationLogging: 'none'
            })

        return message.reply(`Success! Moderator actions with Parallel will no longer be logged`)

    }
    
    const channel = client.util.getChannel(message.guild, args[1])
    if (!channel) return await client.util.throwError(message, client.config.errors.invalid_channel)

    if (channel.type !== 'GUILD_TEXT') return await client.util.throwError(message, client.config.errors.not_type_text_channel)

    if (!channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.SEND_MESSAGES)) {
        return message.reply('I cannot send messages in this channel! Please give me permission to send messages here and run again')
    }

    await settingsSchema.updateOne({
        guildID: message.guild.id,
    },
        {
            moderationLogging: channel.id
        })

    return message.reply(`Success! Moderator actions with Parallel will now be logged in ${channel}`)
}