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
            .setAuthor('Settings', client.user.displayAvatarURL())

        if (!option || option.toLowerCase() !== 'prefix') return message.channel.send(settingslist)

        if (option === 'prefix') {
            if (!setting) return message.channel.send('Please specify a prefix')

            await settingsSchema.updateOne({
                guildid: message.guild.id
            }, {
                prefix: setting
            })

            message.channel.send(`The server prefix for razor is now \`${setting}\`. You can ping me if you ever forget the prefix`)
        }
    }
}

