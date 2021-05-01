const Discord = require('discord.js')

module.exports = {
    name: 'membercount',
    description: 'Shows the number of members in the server',
    usage: 'membercount',
    aliases: ['usercount'],
    async execute(client, message, args) {    
        const membercount = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setTitle('Member Count')
        .setDescription(`There are **${message.guild.memberCount}** users in this server, **${message.guild.members.cache.filter(member => member.user.bot).size}** bots, **${message.guild.members.cache.filter(member => !member.user.bot).size}** humans`)
    
        message.channel.send(membercount)}
}