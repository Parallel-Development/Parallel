const Discord = require('discord.js');
const blacklistSchema = require(`../../schemas/blacklist-schema`)

module.exports = {
    name: 'whitelist',
    description: 'Unblacklists a user from using the bot',
    usage: 'whitelist [user] <reason>',
    aliases: ['unfuck', 'unblacklist', 'nuzzle', 'condom'],
    developer: true,
    async execute(client, message, args) {

        if (!args[0]) return await client.util.throwError(message, client.config.errors.missing_argument_user);
        const member = await client.util.getUser(client, args[0])
        if (!member) return await client.util.throwError(message, client.config.errors.invalid_user);

        const alreadyBlacklisted = await blacklistSchema.findOne({
            ID: member.id,
            server: false
        })

        if (!alreadyBlacklisted) return await client.util.throwError(message, 'This user is not on the blacklist');

        const reason = args.slice(1).join(' ');
        if (!reason) return message.reply('A reason is required!');

        await blacklistSchema.deleteOne({
            ID: member.id,
            server: false
        })

        const channel = client.channels.cache.get('821901486984265797')
        const blacklistLogEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.log)
            .setAuthor('User Whitelisted', client.user.displayAvatarURL())
            .addField('User ID', member.id, true)
            .addField('Reason', reason, true)
            .addField('Blacklist Manager ID', message.author.id)
            .addField('Date', client.util.timestamp(), true)
        channel.send({ embeds: [blacklistLogEmbed] })

        const blacklistEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`${client.config.emotes.success} **${member.tag}** has been removed from the blacklist`)
        return message.reply({ embeds: [blacklistEmbed] });

    }
}

