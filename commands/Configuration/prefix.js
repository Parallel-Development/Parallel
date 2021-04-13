const Discord = require('discord.js')
const { execute } = require('./settings')
const settingsSchema = require('../../schemas/settings-schema')
module.exports = {
    name: 'prefix',
    description: 'Change the bot prefix in your server',
    usage: 'prefix (prefix)',
    async execute(client, message, args) {
        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to execute this command')
            .setAuthor('Error', client.user.displayAvatarURL());
        if (!message.member.hasPermission('MANAGE_GUILD')) return message.channel.send(accessdenied)

        if (!args[0]) return message.channel.send('Please specify a prefix')

        await settingsSchema.updateOne({
            guildid: message.guild.id
        }, {
            prefix: args[0]
        })
        message.channel.send(`The server prefix for razor is now \`${args[0]}\`. You can ping me if you ever forget the prefix`)
    }
}