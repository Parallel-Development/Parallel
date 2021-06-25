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
        .setAuthor(`Server Information for ${message.guild.name}`, client.user.displayAvatarURL())
        .addField('Server ID', message.guild.id, true)
        .addField('Member Count', message.guild.members.cache.size)
        .addField('Channels', `<:text:815451803733852160> ${message.guild.channels.cache.filter(channel => channel.type === 'text').size} Text<:spacer:815451803642626068><:voice:815451803331854367>${message.guild.channels.cache.filter(channel => channel.type === 'voice').size} Voice`)
        .addField('Emojis', message.guild.emojis.cache.size, true)
        .addField('Roles', message.guild.roles.cache.size, true)
        .addField('Highest Role', message.guild.roles.highest)
        .addField('Nitro Boosts', `<:boost:815451803361214465> ${message.guild.premiumSubscriptionCount} (Level ${message.guild.premiumTier})`)
        .addField('Server Owner', message.guild.members.cache.get(message.guild.ownerID))
        .addField('Created', moment(message.guild.createdAt).format('dddd, MMMM Do YYYY, h:mm:ss a'))
        .setFooter(`Information requested by ${message.author.tag}`, client.user.displayAvatarURL())
        .setThumbnail(message.guild.iconURL({dynamic: true}))
    
        message.channel.send(serverinfo)
    }
}
