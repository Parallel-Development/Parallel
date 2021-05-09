const Discord = require('discord.js')

module.exports = {
    name: 'lock',
    description: 'Denies the permission for members to speak in the specified channel',
    usage: 'lock <channel>',
    moderationCommand: true,
    permission: 'MANAGE_CHANNELS',
    async execute(client, message, args) {
        
    }
}