const Discord = require('discord.js')
const ms = require('ms')

module.exports = {
    name: 'settings',
    description: 'Allows you to change server settings',
    usage: 'settings <option>',
    async execute(client, message, args) {
        const settingsSchema = require('../../schemas/settings-schema')

        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to execute this command')
            .setAuthor('Error', client.user.displayAvatarURL());

        if (!message.member.hasPermission('MANAGE_GUILD')) return message.channel.send(accessdenied)

        let option = args[0]
        let setting = args[1]

        const settingslist = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .addField('Prefix', 'Sets the server bot prefix for razor to whatever you input (prefix)')
            .addField('Ban Info', 'Adds another field including a custom message sent to a user\'s DM\'s upon being banned. This could be a ban appeal link')
            .setAuthor('Settings', client.user.displayAvatarURL())

        if (option === 'prefix') {
            if (!setting) return message.channel.send('Please specify a prefix')

            await settingsSchema.updateOne({
                guildid: message.guild.id
            }, {
                prefix: setting
            })

            message.channel.send(`The server prefix for razor is now \`${setting}\`. You can ping me if you ever forget the prefix`)
        } else if(option == 'baninfo') {
            if(!setting) return message.channel.send('Please specify the custom message you wish to use. Make your message `none` to disable the custom message field\nTip: to make a hyperlink, follow this format: \`[text](link)\`')
            const banInfoMessage = args.splice(1).join(' ')

            await settingsSchema.updateOne({
                guildid: message.guild.id
            }, {
                baninfo: banInfoMessage
            })
            const successMessage = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Success! Message: ${banInfoMessage}`)
            message.channel.send(successMessage)
        } else {
            return message.channel.send(settingslist)
        }
    }
}

