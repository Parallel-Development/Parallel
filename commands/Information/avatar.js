const Discord = require('discord.js');

module.exports = {
    name: 'avatar',
    description: "Displays the specified user's avatar",
    usage: 'avatar [user]\navatar [user] --absolute',
    aliases: ['av', 'icon', 'pfp'],
    async execute(client, message, args) {
        let absolute = false;
        const absoluteFlagUsed = args.find(
            arg => arg === '--absolute' || arg === '--a' || arg === '--user' || arg === '--u'
        );

        if (absoluteFlagUsed) {
            absolute = true;
            args.splice(args.indexOf(absoluteFlagUsed), 1);
        }

        const target =
            (await client.util.getMember(message.guild, args[0])) ||
            (await client.util.getUser(client, args[0])) ||
            message.member;
        const user = await client.util.getUser(client, target.id);

        const avatar = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(message.guild))
            .setAuthor(`${user.tag}'s avatar`, client.user.displayAvatarURL())
            .setImage(
                target instanceof Discord.GuildMember
                    ? absoluteFlagUsed
                        ? target.user.displayAvatarURL({ dynamic: true, size: 1024 }).replace('.webp', '.png')
                        : target.displayAvatarURL({ dynamic: true, size: 1024 }).replace('.webp', '.png')
                    : target.displayAvatarURL({ dynamic: true, size: 1024 }).replace('.webp', '.png')
            )
            .setFooter(`Information requested by ${message.author.tag}`, message.author.displayAvatarURL());

        return message.reply({ embeds: [avatar] });
    }
};
