const Discord = require('discord.js');
const blacklistSchema = require(`../../schemas/blacklist-schema`);
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'blacklist',
    description: 'Blacklists a user from using the bot',
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Blacklist a user from using the bot commands')
        .addUserOption(option => option.setName('user').setDescription('The user to blacklist').setRequired(true))
        .addStringOption(option =>
            option.setName('reason').setDescription('The reason for blacklisting the user').setRequired(true)
        ),
    developer: true,
    async execute(client, interaction, args) {
        const user = await client.util.getUser(client, args['user']);

        const alreadyBlacklisted = await blacklistSchema.findOne({
            ID: user.id,
            server: false
        });

        if (alreadyBlacklisted) return client.util.throwError(interaction, 'this user is already on the blacklist');

        const reason = args['reason'];

        await new blacklistSchema({
            ID: user.id,
            date: client.util.timestamp(),
            reason: reason,
            sent: false,
            server: false
        }).save();

        client.cache.whitelistedUsers.splice(client.cache.whitelistedUsers.indexOf(user.id), 1);

        const blacklistEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.punishment[2])
            .setDescription(`✅ **${user.tag}** has been added to the blacklist`);
        return interaction.reply({ embeds: [blacklistEmbed] });
    }
};
