const Discord = require('discord.js');
const blacklistSchema = require(`../../schemas/blacklist-schema`)

module.exports = {
    name: 'blacklist',
    description: 'Blacklists a user from using the bot',
    usage: 'blacklist [ID] <reason>',
    aliases: ['fuck'],
    developer: true,
    async execute(client, message, args) {

        if (!args[0]) return await client.util.throwError(message, client.config.errors.missing_argument_user);
        const member = await client.util.getUser(client, args[0])
        if (!member) return await client.util.throwError(message, client.config.errors.invalid_user);

        const alreadyBlacklisted = await blacklistSchema.findOne({
            ID: member.id,
            server: false
        })

        if (alreadyBlacklisted) return await client.util.throwError(message, 'This user is already on the blacklist');

        const reason = args.slice(1).join(' ');
        if (!reason) return await client.util.throwError(message, 'A reason is required!');

        await new blacklistSchema({
            ID: member.id,
            date: client.util.timestamp(),
            reason: reason,
            sent: false,
            server: false
        }).save();

        const channel = client.channels.cache.get('821901486984265797')
        const blacklistLogEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.log)
            .setAuthor('User Blacklisted', client.user.displayAvatarURL())
            .addField('User ID', member.id, true)
            .addField('Reason', reason, true)
            .addField('Blacklist Manager ID', message.author.id)
            .addField('Date', client.util.timestamp(), true)
        channel.send({ embeds: [blacklistLogEmbed] })

        const blacklistEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.punishment[2])
        .setDescription(`${client.config.emotes.success} **${member.tag}** has been added to the blacklist`)
        return message.reply({ embeds: [blacklistEmbed]  });

    }
}
