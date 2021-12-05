const settingsSchema = require('../../schemas/settings-schema');
const ms = require('ms');
const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const Infraction = require('../../structures/Infraction');

module.exports = {
    name: 'warn',
    description: 'Issue a warning against a member',
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Issue a warning against a member')
        .addUserOption(option => option.setName('user').setDescription('The user to warn').setRequired(true))
        .addStringOption(option =>
            option
                .setName('duration')
                .setDescription('The duration of the warning | Set this to permanent to make it permanent')
        )
        .addStringOption(option => option.setName('reason').setDescription('The warning reason')),
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    async execute(client, interaction, args) {
        const member = await client.util.getMember(interaction.guild, args['user']);
        if (!member) return client.util.throwError(interaction, client.config.errors.invalid_member);

        if (
            member.roles.highest.position >= interaction.member.roles.highest.position &&
            interaction.member.id !== interaction.guild.ownerId
        )
            return client.util.throwError(interaction, client.config.errors.hierarchy);
        if (member.id === client.user.id)
            return client.util.throwError(interaction, client.config.errors.cannot_punish_myself);
        if (member.id === interaction.member.id)
            return client.util.throwError(interaction, client.config.errors.cannot_punish_yourself);
        if (member === interaction.guild.owner)
            return client.util.throwError(interaction, client.config.errors.cannot_punish_owner);

        const punishmentID = client.util.createSnowflake();

        let time = args['duration'] ? ms(args['duration']) : null;
        if (time && time > 315576000000) return client.util.throwError(interaction, client.config.errors.time_too_long);
        const reason = args['reason'] || 'Unspecified';

        const settings = await settingsSchema.findOne({
            guildID: interaction.guild.id
        });

        const { manualwarnexpire } = settings;
        const { delModCmds } = settings;

        if (
            !time &&
            manualwarnexpire !== 'disabled' &&
            args['duration'] !== 'permanent' &&
            args['duration'] !== 'p' &&
            args['duration'] !== 'forever'
        )
            time = parseInt(manualwarnexpire);

        new Infraction(client, 'Warn', interaction, interaction.member, member, {
            reason: reason,
            punishmentID: punishmentID,
            time: time,
            auto: false
        });
        await new DMUserInfraction(client, 'warned', client.config.colors.punishment[1], interaction, member, {
            reason: reason,
            punishmentID: punishmentID,
            time: time
        });
        new ModerationLogger(client, 'Warned', interaction.member, member, interaction.channel, {
            reason: reason,
            duration: time,
            punishmentID: punishmentID
        });

        const warnedEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.punishment[0])
            .setDescription(`✅ ${member.toString()} has been warned with ID \`${punishmentID}\``);

        if (delModCmds) {
            await interaction.reply({ content: `Successfully warned member ${member}`, ephemeral: true });
            return interaction.channel.send({ embeds: [warnedEmbed] });
        } else return interaction.reply({ embeds: [warnedEmbed] });
    }
};
