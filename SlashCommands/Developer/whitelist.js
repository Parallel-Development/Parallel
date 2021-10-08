const Discord = require('discord.js');
const blacklistSchema = require(`../../schemas/blacklist-schema`);
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'whitelist',
    description: 'Unblacklists a user from using the bot',
    data: new SlashCommandBuilder().setName('whitelist').setDescription('Unblacklist a user from using the bot commands')
    .addUserOption(option => option.setName('user').setDescription('The user to whitelist').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for whitelisting the user').setRequired(true)),
    developer: true,
    async execute(client, interaction, args) {

        const user = await client.util.getUser(client, args['user']);

        const alreadyBlacklisted = await blacklistSchema.findOne({
            ID: user.id,
            server: false
        })

        if (!alreadyBlacklisted) return client.util.throwError(interaction, 'This user is not on the blacklist');

        const reason = args['reason'];

        await blacklistSchema.deleteOne({
            ID: user.id,
            server: false
        })

        const channel = client.channels.cache.get('821901486984265797')
        const blacklistLogEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.log)
            .setAuthor('User Whitelisted', client.user.displayAvatarURL())
            .addField('User ID', user.id, true)
            .addField('Reason', reason, true)
            .addField('Blacklist Manager ID', interaction.user.id)
            .addField('Date', client.util.timestamp(), true)
        channel.send({ embeds: [blacklistLogEmbed] })

        const blacklistEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`✅ **${user.tag}** has been removed from the blacklist`)
        return interaction.reply({ embeds: [blacklistEmbed] });

    }
}

