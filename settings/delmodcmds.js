const Discord = require('discord.js')
const settingsSchema = require('../schemas/settings-schema')

exports.run = async(client, message, args) => {
    const option = args[1]

    switch (option) {
        case 'enable':
            await settingsSchema.updateOne({
                guildid: message.guild.id
            },
                {
                    delModCmds: true
                })
            message.channel.send('The command ran by the moderator for all moderation commands will now be deleted')
            break;
        case 'disable':
            await settingsSchema.updateOne({
                guildid: message.guild.id
            },
                {
                    delModCmds: false
                })
            message.channel.send('The command ran by the moderator for all moderation commands will no longer be deleted')
            break;
        default:
            message.channel.send('Options: enable, disable')
    }
}