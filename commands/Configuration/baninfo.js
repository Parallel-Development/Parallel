const Discord = require('discord.js')
const { execute } = require('./settings')
const settingsSchema = require('../../schemas/settings-schema')
module.exports = {
    name: 'baninfo',
    description: 'Add an extra field to the DM users get on ban, or whatever message you specify, such as a ban appeal link',
    permissions: 'MANAGE_GUILD',
    moderationCommand: true,
    usage: 'baninfo (msg)',
    async execute(client, message, args) {

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