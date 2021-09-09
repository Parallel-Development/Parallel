const Discord = require('discord.js');
const blacklistSchema = require(`../../schemas/blacklist-schema`)

module.exports = {
    name: 'whitelist-server',
    description: 'Unblacklists a server from using the bot',
    usage: 'whitelist-server [ID] <reason>',
    aliases: ['unfuck-server', 'nuzzle-server', 'condom-server'],
    developer: true,
    async execute(client, message, args) {

        if (!args[0]) return await client.util.throwError(message, client.config.errors.missing_argument_user);
        const ID = args[0];

        const alreadyBlacklisted = await blacklistSchema.findOne({
            ID: ID,
            server: true
        })

        if (!alreadyBlacklisted) return await client.util.throwError(message, 'This server is not blacklisted');

        const reason = args.slice(1).join(' ');
        if (!reason) return await client.util.throwError(message, 'A reason is required!');

        await blacklistSchema.deleteOne({
            ID: ID,
            server: true
        })

        const channel = client.channels.cache.get('821901486984265797')
        const blacklistLogEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.log)
            .setAuthor('Server Whitelisted', client.user.displayAvatarURL())
            .addField('Server ID', message.author.id, true)
            .addField('Reason', reason, true)
            .addField('Blacklist Manager ID', message.author.id)
            .addField('Date', client.util.timestamp(), true)
        channel.send({ embeds: [blacklistLogEmbed] })

        const blacklistEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`${client.config.emotes.success} Server with ID  **${ID}** has been whitelisted`)
        return message.reply({ embeds: [blacklistEmbed] });

    }
}
