const Discord = require('discord.js')
const { execute } = require('./settings')
const settingsSchema = require('../../schemas/settings-schema')
module.exports = {
    name: 'baninfo',
    description: 'Change the bot prefix in your server',
    usage: 'baninfo (msg)',
    async execute(client, message, args) {
        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to execute this command')
            .setAuthor('Error', client.user.displayAvatarURL());
        if (!message.member.hasPermission('MANAGE_GUILD')) return message.channel.send(accessdenied)

        if (!args[0]) return message.channel.send('Please specify the custom message you wish to use. Make your message `none` to disable the custom message field\nTip: to make a hyperlink, follow this format: \`[text](link)\`')
        const banInfoMessage = args.join(' ')

        await settingsSchema.updateOne({
            guildid: message.guild.id
        }, {
            baninfo: banInfoMessage
        })
        const successMessage = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Success! Message: ${banInfoMessage}`)
        message.channel.send(successMessage)
    }
}