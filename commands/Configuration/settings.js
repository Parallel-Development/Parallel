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

        message.channel.send('Settings is no longer a command! Changing a setting, like the prefix, is a single command itself now. Example: `prefix (prefix)` instead of `settings prefix (prefix)`')
    }
}

