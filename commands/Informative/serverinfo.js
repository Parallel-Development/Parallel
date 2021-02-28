const Discord = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'serverinfo',
    description: 'Shows information related to the server',
    usage: 'serverinfo',
    aliases: ['guildinfo'],
    async execute(client, message, args) {    
        const serverinfo = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription(`Server information for **${message.guild.name}**`)
        .addField('Server ID', message.guild.id, true)
        .addField('Members', `<:offline:815453799917420565> ${message.guild.memberCount} Members<:spacer:815451803642626068><:online:815451803683651594>${message.guild.members.cache.filter(member => member.presence.status !== 'offline').size} Online`)
        .addField('Channels', `<:text:815451803733852160> ${message.guild.channels.cache.filter(channel => channel.type === 'text').size} Text<:spacer:815451803642626068><:voice:815451803331854367>${message.guild.channels.cache.filter(channel => channel.type === 'voice').size} Voice`)
        .addField('Emojis', message.guild.emojis.cache.size, true)
        .addField('Roles', message.guild.roles.cache.size, true)
        .addField('Highest Role', message.guild.roles.highest)
        .addField('Nitro Boosts', `<:boost:815451803361214465> ${message.guild.premiumSubscriptionCount} (Level ${message.guild.premiumTier})`)
        .addField('Server Owner', message.guild.owner)
        .addField('Created', moment(message.guild.createdAt).format('dddd, MMMM Do YYYY, h:mm:ss a'))
        .setFooter(`Information requested by ${message.author.tag}`)
        .setThumbnail(message.guild.iconURL({dynamic: true}))
    
        message.channel.send(serverinfo)
    }
}