const Discord = require('discord.js');

module.exports = {
    name: 'membercount',
    description: 'Shows the number of members on the server',
    usage: 'membercount\nmembercount detailed',
    aliases: ['usercount'],
    async execute(client, message, args) {
        await message.guild.members.fetch();

        const botCount = message.guild.members.cache.filter(u => u.user.bot).size;
        const humanCount = message.guild.members.cache.filter(u => !u.user.bot).size;

        if (args[0]?.toLowerCase() === 'detailed') {
            const membercountDetailed = new Discord.MessageEmbed()
                .setColor(client.util.mainColor(message.guild))
                .setTitle('Member Count')
                .setDescription(
                    `There are **${
                        message.guild.memberCount
                    }** members on this server. **${botCount}** of these members are bot accounts, and **${humanCount}** of these members are human accounts. To put that into a ratio, for every bot account there are around **${Math.floor(
                        humanCount / botCount
                    )}** human accounts. Out of all the members, around **${Math.floor(
                        (humanCount / message.guild.memberCount) * 100
                    )}%** of them are human accounts, and the remaining **${
                        100 - Math.floor((humanCount / message.guild.memberCount) * 100)
                    }%** are bot accounts`
                )
                .setFooter(`Information requested by ${message.author.tag}`, message.author.displayAvatarURL())
                .setThumbnail(message.guild.iconURL({ dynamic: true }));

            return message.reply({ embeds: [membercountDetailed] });
        } else {
            const membercount = new Discord.MessageEmbed()
                .setColor(client.util.mainColor(message.guild))
                .setTitle('Member Count')
                .setDescription(
                    `There are **${message.guild.memberCount}** members on this server. **${botCount}** of these members are bot accounts, and **${humanCount}** of these members are human accounts`
                )
                .setFooter(`Information requested by ${message.author.tag}`, message.author.displayAvatarURL())
                .setThumbnail(message.guild.iconURL({ dynamic: true }));

            return message.reply({ embeds: [membercount] });
        }
    }
};
