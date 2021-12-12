const Discord = require('discord.js');
const blacklistSchema = require(`../../schemas/blacklist-schema`);

module.exports = {
    name: 'whitelist-server',
    description: 'Unblacklists a server from using the bot',
    usage: 'whitelist-server [ID] <reason>',
    aliases: ['unfuck-server', 'nuzzle-server', 'condom-server'],
    developer: true,
    async execute(client, message, args) {
        if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_number);
        const ID = args[0];

        const alreadyBlacklisted = await blacklistSchema.findOne({
            ID: ID,
            server: true
        });

        if (!alreadyBlacklisted) return client.util.throwError(message, 'this server is not blacklisted');

        const reason = args.slice(1).join(' ');
        if (!reason) return client.util.throwError(message, 'a reason is required!');

        await blacklistSchema.deleteOne({
            ID: ID,
            server: true
        });

        if (client.cache.whitelistedServers.includes(ID)) delete client.cache.whitelistedServers[ID];

        const blacklistEmbed = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(message.guild))
            .setDescription(`${client.config.emotes.success} Server with ID **${ID}** has been whitelisted`);
        return message.reply({ embeds: [blacklistEmbed] });
    }
};
