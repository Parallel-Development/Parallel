const Discord = require('discord.js')
const ms = require('ms')

module.exports = {
    name: 'settings',
    description: 'Allows you to change server settings',
    permissions: 'MANAGE_GUILD',
    usage: 'settings <option>',
    depricated: true,
    async execute(client, message, args) {

        message.channel.send('Settings is no longer a command! Changing a setting, like the prefix, is a single command itself now. Example: `prefix (prefix)` instead of `settings prefix (prefix)`')
    }
}

