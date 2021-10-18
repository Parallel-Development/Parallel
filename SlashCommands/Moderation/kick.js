const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const Infraction = require('../../structures/Infraction');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'kick',
    description: 'Kick a member from the server',
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
            option.setName('member').setDescription('The member to kick from the server').setRequired(true)
        )
        .addStringOption(option => option.setName('reason').setDescription('The reason for kicking the member')),
    permissions: Discord.Permissions.FLAGS.KICK_MEMBERS,
    requiredBotPermission: Discord.Permissions.FLAGS.KICK_MEMBERS,
    async execute(client, interaction, args) {
        const member = await client.util.getMember(interaction.guild, args['member']);
        if (!member) return client.util.throwError(interaction, client.config.errors.invalid_member);

        if (member.id === client.user.id)
            return client.util.throwError(interaction, client.config.errors.cannot_punish_myself);
        if (member.id === interaction.member.id)
            return client.util.throwError(interaction, client.config.errors.cannot_punish_yourself);
        if (
            member.roles.highest.position >= interaction.member.roles.highest.position &&
            interaction.member.id !== interaction.guild.ownerId
        )
            return client.util.throwError(interaction, client.config.errors.hierarchy);
        if (member.roles.highest.position >= interaction.guild.me.roles.highest.position)
            return client.util.throwError(interaction, client.config.errors.my_hierarchy);
        if (member.id === interaction.guild.ownerId)
            return client.util.throwError(interaction, client.config.errors.cannot_punish_owner);

        const punishmentID = client.util.generateID();

        const reason = args['reason'] || 'Unspecified';

        const settings = await settingsSchema.findOne({
            guildID: interaction.guild.id
        });

        const { delModCmds } = settings;

        await new DMUserInfraction(client, 'kicked', client.config.colors.punishment[1], interaction, member, {
            reason: reason,
            punishmentID: punishmentID,
            time: 'ignore'
        });

        await member.kick(reason);

        new Infraction(client, 'Kick', interaction, interaction.member, member, {
            reason: reason,
            punishmentID: punishmentID,
            time: null,
            auto: false
        });
        new ModerationLogger(client, 'Kicked', interaction.member, member, interaction.channel, {
            reason: reason,
            duration: null,
            punishmentID: punishmentID
        });

        const kickedEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.punishment[1])
            .setDescription(`✅ ${member.toString()} has been kicked with ID \`${punishmentID}\``);

        if (delModCmds) {
            await interaction.reply({ content: `Successfully kicked member ${member}`, ephemeral: true });
            return interaction.channel.send({ embeds: [kickedEmbed] });
        } else return interaction.reply({ embeds: [kickedEmbed] });
    }
};
