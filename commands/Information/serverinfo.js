const Discord = require('discord.js')

module.exports = {
    name: 'serverinfo',
    description: 'Shows information related to the server',
    usage: 'serverinfo',
    aliases: ['guildinfo', 'guildinformation', 'serverinformation'],
    async execute(client, message, args) {
        const serverinfo = new Discord.MessageEmbed()

            .setColor(client.config.colors.main)
            .setAuthor(`Server Information for ${message.guild.name}`, client.user.displayAvatarURL())
            .addField('Server ID', message.guild.id, true)
            .addField('Member Count', message.guild.members.cache.size)
            .addField('Channel Count', `<:text:815451803733852160> ${message.guild.channels.cache.filter(channel => channel.type === 'text').size} Text<:spacer:815451803642626068><:voice:815451803331854367>${message.guild.channels.cache.filter(channel => channel.type === 'voice').size} Voice`)
            .addField('Emoji Count', message.guild.emojis.cache.size, true)
            .addField('Role Count', message.guild.roles.cache.size, true)
            .addField('Highest Role', message.guild.roles.highest)
            .addField('Nitro Boosts', `<:boost:815451803361214465> ${message.guild.premiumSubscriptionCount} (Level ${message.guild.premiumTier})`)
            .addField('Server Owner', message.guild.owner)
            .addField('Created', client.util.timestamp(message.guild.createdAt))
            .setFooter(`Information requested by ${message.author.tag}`, client.user.displayAvatarURL())
            .setThumbnail(message.guild.iconURL({ dynamic: true }))

        return message.channel.send(serverinfo)
    }
}
