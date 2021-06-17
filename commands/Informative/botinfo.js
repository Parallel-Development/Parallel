const Discord = require('discord.js')
const { execute } = require('../Moderation/warnings')

module.exports = {
    name: 'botinfo',
    description: 'Sends information about the bot',
    usage: 'botinfo',
    async execute(client, message, args) {
        
        function cleanTime(amount) {
            let days = 0;
            let hours = 0;
            let minutes = 0;
            let seconds = amount / 1000;

            while (seconds >= 60) {
                seconds -= 60;
                minutes++
            }

            while (minutes >= 60) {
                minutes -= 60;
                hours++
            }

            while (hours >= 24) {
                hours -= 24;
                days++
            }

            let product = [];
            if (days > 0) product.push(`${Math.round(days)} days`)
            if (hours > 0) product.push(`${Math.round(hours)} hours`)
            if (minutes > 0) product.push(`${Math.round(minutes)} minutes`)
            if (seconds > 0) product.push(`${Math.round(seconds)} seconds`)

            return product.join(', ')

        }

        const uptime = cleanTime(client.uptime)
        const botinfo = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription('Razor is a discord bot created for the main purpose of moderation, but includes music, informative, and helpful commands. If you would like to join the development / support server, click [here](https://discord.gg/DcmVMPx8bn)')
            .addField('Library & Version', '<:discordjs:810209255353352242> discord.js v12.5.1', true)
            .addField('Developers', 'Piyeris, dzlandis', true)
            .addField('Ping (Websocket)', `${client.ws.ping}ms`, true)
            .addField('Servers', client.guilds.cache.size, true)
            .addField('Uptime', uptime, true)
            .setAuthor('Razor Discord Bot', client.user.displayAvatarURL())

        message.channel.send(botinfo)
    }
}
