const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async (client, message, args) => {

    if (args[1] === 'none') {
        await settingsSchema.updateOne({
            guildID: message.guild.id,
        },
            {
                messageLogging: 'none'
            })

        return message.reply(`Success! Messages updates will no longer be logged`)
    }
    
    const channel = client.util.getChannel(message.guild, args[1]);
    if (!channel) return await client.util.throwError(message, client.config.errors.invalid_channel)

    if (!args[1]) return await client.util.throwError(message, client.config.errors.missing_argument_channel);
    if (channel.type !== 'GUILD_TEXT') return await client.util.throwError(message, client.config.errors.not_type_text_channel);

    if (!channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.SEND_MESSAGES)) {
        return message.reply('I cannot send messages in this channel! Please give me permission to send messages here and run again')
    }

    await settingsSchema.updateOne({
        guildID: message.guild.id,
    },
        {
            messageLogging: channel.id
        })

    message.reply(`Success! Messages updates will now be logged in ${channel}`)
}