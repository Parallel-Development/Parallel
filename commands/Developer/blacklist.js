const Discord = require('discord.js');
const blacklistSchema = require(`../../schemas/blacklist-schema`)

module.exports = {
    name: 'blacklist',
    description: 'Blacklists a user from using the bot',
    usage: 'blacklist [ID] <reason>',
    aliases: ['fuck'],
    developer: true,
    async execute(client, message, args) {
        if(!client.config.developers.includes(message.author.id)) return message.reply('Sorry, you can\'t run that!');

        if(!args[0]) return message.reply(client.config.errorMessages.missing_argument_user);
        const member = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => {});
        if(!member) return message.reply(client.config.errorMessages.invalid_user);

        const alreadyBlacklisted = await blacklistSchema.findOne({
            ID: member.id,
            server: false
        })

        if(alreadyBlacklisted) return message.reply('This user is already on the blacklist');

        const reason = args.slice(1).join(' ');
        if(!reason) return message.reply('A reason is required!');

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
