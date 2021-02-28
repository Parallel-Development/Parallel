const Discord = require('discord.js')
const { execute } = require('../Moderation/warnings')

module.exports = {
    name: 'botinfo',
    description: 'Sends information about the bot',
    usage: 'botinfo',
    async execute(client, message, args) {
        const botinfo = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription('Razor is a discord bot created for the main purpose of moderation, but includes music, informative, and helpful commands. If you would like to join the development / support server, click [here](https://discord.gg/DcmVMPx8bn)')
            .addField('Library & Version', '<:discordjs:810209255353352242> discord.js v12.5.1', true)
            .addField('Developer(s)', 'Piyeris, seb.go', true)
            .addField('Ping', `${client.ws.ping}ms`, true)
            .addField('Servers', client.guilds.cache.size, true)
            .setAuthor('Razor Discord Bot', client.user.displayAvatarURL())

        message.channel.send(botinfo)
    }
}