const Discord = require('discord.js');
const blacklistSchema = require(`../../schemas/blacklist-schema`)

module.exports = {
    name: 'blacklist-server',
    description: 'Blacklists a server from using the bot',
    usage: 'blacklist-server [ID] <reason>',
    aliases: ['fuck'],
    developer: true,
    async execute(client, message, args) {

        if (!args[0]) return await client.util.throwError(message, client.config.errors.missing_argument_number);
        const ID = args[0];

        const alreadyBlacklisted = await blacklistSchema.findOne({
            ID: ID,
            server: true
        })

        if (alreadyBlacklisted) return await client.util.throwError(message, 'This server is already on the blacklist');

        const reason = args.slice(1).join(' ');
        if (!reason) return await client.util.throwError(message, 'A reason is required!');

        await new blacklistSchema({
            ID: ID,
            date: client.util.timestamp(),
            reason: reason,
            sent: false,
            server: true
        }).save();

        const channel = client.channels.cache.get('821901486984265797')
        const blacklistLogEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.log)
            .setAuthor('Server Blacklisted', client.user.displayAvatarURL())
            .addField('Server ID', ID, true)
            .addField('Reason', reason, true)
            .addField('Blacklist Manager ID', message.author.id)
            .addField('Date', client.util.timestamp(), true)
        channel.send({ embeds: [blacklistLogEmbed] })

        const blacklistEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.punishment[2])
            .setDescription(`${client.config.emotes.success} Server ID **${ID}** has been added to the blacklist`)
        return message.reply({ embeds: [blacklistEmbed] });

    }
}