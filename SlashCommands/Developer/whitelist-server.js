const Discord = require('discord.js');
const blacklistSchema = require(`../../schemas/blacklist-schema`);
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'whitelist-server',
    description: 'Unblacklists a server from using the bot',
    data: new SlashCommandBuilder().setName('whitelist-server').setDescription('Unlacklist a server from using the bot').setDefaultPermission(false)
    .addStringOption(option => option.setName('guild_id').setDescription('The ID of the guild to whitelist').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for whitelisting the server').setRequired(true)),
    userPermissions: [
        {
            id: '633776442366361601',
            type: 'USER',
            permission: true
        },
        {
            id: '483375587176480768',
            type: 'USER',
            permission: true
        }
    ],
    developer: true,
    async execute(client, interaction, args) {

        const ID = args['user'];
        if (ID.length !== 18) return client.util.throwError(interaction, 'The provided guild ID is not possible (not a snowflake)');

        const alreadyBlacklisted = await blacklistSchema.findOne({
            ID: ID,
            server: true
        })

        if (!alreadyBlacklisted) return client.util.throwError(interaction, 'This server is not blacklisted');

        const reason = args['reason'];

        await blacklistSchema.deleteOne({
            ID: ID,
            server: true
        })

        const channel = client.channels.cache.get('821901486984265797')
        const blacklistLogEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.log)
            .setAuthor('Server Whitelisted', client.user.displayAvatarURL())
            .addField('Server ID', interaction.user.id, true)
            .addField('Reason', reason, true)
            .addField('Blacklist Manager ID', interaction.user.id)
            .addField('Date', client.util.timestamp(), true)
        channel.send({ embeds: [blacklistLogEmbed] })

        const blacklistEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`✅ Server ID **${ID}** has been whitelisted`)
        return interaction.reply({ embeds: [blacklistEmbed] });

    }
}
