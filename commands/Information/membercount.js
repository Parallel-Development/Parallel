const Discord = require('discord.js');

module.exports = {
    name: 'membercount',
    description: 'Shows the number of members on the server',
    usage: 'membercount',
    aliases: ['usercount'],
    async execute(client, message, args) {
        await message.guild.members.fetch();

        const membercountDetailed = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(message.guild))
            .setAuthor('Member Count', client.user.displayAvatarURL())
            .setTitle(`There are currently \`${message.guild.memberCount}\` members in \`${message.guild.name}\``)
            .setDescription(
                `**${message.guild.members.cache.filter(m => m.user.bot).size}** bots, **${
                    message.guild.members.cache.filter(m => !m.user.bot).size
                }** humans`
            )
            .setFooter(`Information requested by ${message.author.tag}`, message.author.displayAvatarURL())
            .setThumbnail(message.guild.iconURL({ dynamic: true }));

        return message.reply({ embeds: [membercountDetailed] });
    }
};
