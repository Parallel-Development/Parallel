const Discord = require('discord.js')

module.exports = {
    name: 'membercount',
    description: 'Shows the number of members on the server',
    usage: 'membercount',
    aliases: ['usercount'],
    async execute(client, message, args) {
        
        const membercount = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setTitle('Member Count')
            .setDescription(`There are **${message.guild.memberCount}** members on this server`)

        return message.reply({ embeds: [membercount] })
    }
}