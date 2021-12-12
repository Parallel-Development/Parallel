const Discord = require('discord.js');
const blacklistSchema = require(`../../schemas/blacklist-schema`);

module.exports = {
    name: 'blacklist',
    description: 'Blacklists a user from using the bot',
    usage: 'blacklist [ID] <reason>',
    aliases: ['fuck'],
    developer: true,
    async execute(client, message, args) {
        if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_user);
        const member = await client.util.getUser(client, args[0]);
        if (!member) return client.util.throwError(message, client.config.errors.invalid_user);

        const alreadyBlacklisted = await blacklistSchema.findOne({
            ID: member.id,
            server: false
        });

        if (alreadyBlacklisted) return client.util.throwError(message, 'this user is already on the blacklist');

        const reason = args.slice(1).join(' ');
        if (!reason) return client.util.throwError(message, 'a reason is required!');

        await new blacklistSchema({
            ID: member.id,
            date: client.util.timestamp(),
            reason: reason,
            sent: false,
            server: false
        }).save();

        client.cache.whitelistedUsers.splice(client.cache.whitelistedUsers.indexOf(member.id), 1);

        const blacklistEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.punishment[2])
            .setDescription(`${client.config.emotes.success} **${member.tag}** has been added to the blacklist`);
        return message.reply({ embeds: [blacklistEmbed] });
    }
};
