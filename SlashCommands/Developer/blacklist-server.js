const Discord = require('discord.js');
const blacklistSchema = require(`../../schemas/blacklist-schema`);
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'blacklist-server',
    description: 'Blacklists a server from using the bot',
    data: new SlashCommandBuilder()
        .setName('blacklist-server')
        .setDescription('Blacklist a server from using the bot')
        .addStringOption(option =>
            option.setName('guild_id').setDescription('The ID of the guild to blacklist').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('The reason for blacklisting the server').setRequired(true)
        ),
    developer: true,
    async execute(client, interaction, args) {
        const ID = args['guild_id'];
        if (ID.length !== 18)
            return client.util.throwError(interaction, 'The provided guild ID is not possible (not a snowflake)');

        const alreadyBlacklisted = await blacklistSchema.findOne({
            ID: ID,
            server: true
        });

        if (alreadyBlacklisted) return client.util.throwError(interaction, 'This server is already on the blacklist');

        const reason = args['reason'];

        await new blacklistSchema({
            ID: ID,
            date: client.util.timestamp(),
            reason: reason,
            sent: false,
            server: true
        }).save();

        

        delete client.cache.whitelistedServers[ID];

        const blacklistEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.punishment[2])
            .setDescription(`✅ Server ID **${ID}** has been added to the blacklist`);
        return interaction.reply({ embeds: [blacklistEmbed] });
    }
};
