const Discord = require('discord.js');

module.exports = {
    name: 'membercount',
    description: 'Shows the number of members on the server',
    usage: 'membercount\nmembercount detailed',
    aliases: ['usercount'],
    async execute(client, message, args) {

        const membercountDetailed = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(message.guild))
            .setAuthor('Member Count', client.user.displayAvatarURL())
            .setTitle(`There are currently \`${message.guild.memberCount}\` members in \`${message.guild.name}\``)
            .setFooter(`Information requested by ${message.author.tag}`, message.author.displayAvatarURL())
            .setThumbnail(message.guild.iconURL({ dynamic: true }));

        return message.reply({ embeds: [membercountDetailed] });
    }
};
