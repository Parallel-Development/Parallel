const Discord = require('discord.js');
const Infraction = require('../../structures/Infraction');
const ModerationLogger = require('../../structures/ModerationLogger');
const punishmentSchema = require('../../schemas/punishment-schema');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'unban',
    description: 'Unban a member from the server',
    data: new SlashCommandBuilder().setName('unban').setDescription('Unban a member from the server')
    .addUserOption(option => option.setName('user').setDescription('The user to unban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for unbanning the user')),
    permissions: Discord.Permissions.FLAGS.BAN_MEMBERS,
    requiredBotPermission: Discord.Permissions.FLAGS.BAN_MEMBERS,
    async execute(client, interaction, args) {


        const user = await client.util.getUser(client, args['user']);
        if (!user) return client.util.throwError(interaction, client.config.errors.invalid_user);

        const reason = args['reason'] || 'Unspecified';

        const serverBans = await interaction.guild.bans.fetch();
        if (!serverBans.size) return client.util.throwError(interaction, 'There are no users banned from this server');
        const userBanned = await interaction.guild.bans.fetch().then(bans => bans.find(ban => ban.user.id === user.id));
        if (!userBanned) return client.util.throwError(interaction, 'This user is not banned');

        await interaction.guild.members.unban(user.id);

        await punishmentSchema.deleteMany({
            guildID: interaction.guild.id,
            userID: user.id,
            type: 'ban'
        })

        const punishmentID = client.util.generateID();

        new Infraction(client, 'Unban', interaction, interaction.member, user, { reason: reason, punishmentID: punishmentID, time: null, auto: false });
        new ModerationLogger(client, 'Unbanned', interaction.member, user, interaction.channel, { reason: reason, duration: null, punishmentID: punishmentID });

        const unbannedEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`✅ **${user.tag}** has been unbanned`)

        return interaction.reply({ embeds: [unbannedEmbed] });


    }
}