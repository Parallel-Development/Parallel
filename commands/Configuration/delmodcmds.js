const Discord = require('discord.js')
const settingsSchema = require('../../schemas/settings-schema')

module.exports = {
    name: 'delmodcmds',
    description: 'Enables or disables a setting in which it deletes the command ran by the moderator for all moderation commands',
    aliases: ['deletemoderationcommands'],
    usage: 'delmodcmds <option: enable, disable>',
    async execute(client, message, args) {
        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to execute this command')
            .setAuthor('Error', client.user.displayAvatarURL());

        if (!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send(accessdenied)

        const option = args[0]

        switch(option) {
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
}