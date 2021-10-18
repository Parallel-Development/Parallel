const Discord = require('discord.js');

module.exports = {
    name: 'avatar',
    description: "Displays the specified user's avatar",
    usage: 'avatar [user]',
    aliases: ['av', 'icon', 'pfp'],
    async execute(client, message, args) {
        const user = (await client.util.getUser(client, args[0])) || message.author;

        const avatar = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setAuthor(`${user.tag}'s avatar`, client.user.displayAvatarURL())
            .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }).replace('.webp', '.png'))
            .setFooter(`Information requested by ${message.author.tag}`, message.author.displayAvatarURL());

        return message.reply({ embeds: [avatar] });
    }
};
