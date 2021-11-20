const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');
const punishmentSchema = require('../../schemas/punishment-schema');
const settingsSchema = require('../../schemas/settings-schema');
const ms = require('ms');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'duration',
    description: 'Change the duration of a punishment',
    data: new SlashCommandBuilder()
        .setName('duration')
        .setDescription('Change the duration of a punishment')
        .addStringOption(option =>
            option.setName('id').setDescription('The ID of the punishment to change the duration of').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('new_duration').setDescription('The new duration to set the punishment to').setRequired(true)
        ),
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    async execute(client, interaction, args) {
        const guildSettings = await settingsSchema.findOne({ guildID: interaction.guild.id });
        const { modRoles } = guildSettings;
        const isModerator = interaction.member.roles.cache.some(role => modRoles.includes(role.id));

        const punishmentID = args['id'];
        const newDuration = args['new_duration']?.toLowerCase();
        if (!newDuration) return client.util.throwError(interaction, client.config.errors.missing_argument_duration);
        if (!punishmentID)
            return client.util.throwError(interaction, client.config.errors.missing_argument_punishmentID);

        const punishmentInformation = await warningSchema.findOne({
            guildID: interaction.guild.id,
            warnings: {
                $elemMatch: {
                    punishmentID: punishmentID
                }
            }
        });

        if (!punishmentInformation)
            return client.util.throwError(interaction, client.config.errors.invalid_punishmentID);

        const punishment = punishmentInformation.warnings.find(key => key.punishmentID === punishmentID);
        if (punishment.type !== 'Mute' && punishment.type !== 'Ban' && punishment.type !== 'Warn')
            return client.util.throwError(
                interaction,
                `can only edit punishment durations with punishment type \`warn\`, \`mute\`, or \`ban\``
            );
        if (
            punishment.type === 'Mute' &&
            !interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_ROLES) &&
            !isModerator
        )
            return client.util.throwError(
                interaction,
                `you need the \`Manage Roles\` permission or a moderator role to edit this punishment duration`
            );
        if (
            punishment.type === 'Ban' &&
            !interaction.member.permissions.has(Discord.Permissions.FLAGS.BAN_MEMBERS) &&
            !isModerator
        )
            return client.util.throwError(
                interaction,
                `you need the \`Ban Members\` permission or a moderator role to edit this punishment duration`
            );

        if (punishment.expires - Date.now() <= 0)
            return client.util.throwError(interaction, 'this punishment has already expired');

        if (newDuration !== 'permanent') {
            if (!ms(newDuration)) return client.util.throwError(interaction, client.config.errors.bad_duration);
            if (ms(newDuration) > 315576000000)
                return client.util.throwError(interaction, client.config.errors.time_too_long);
        }

        await warningSchema.updateOne(
            {
                guildID: interaction.guild.id,
                warnings: {
                    $elemMatch: {
                        punishmentID: punishmentID
                    }
                }
            },
            {
                $set: {
                    'warnings.$.expires': newDuration === 'permanent' ? 'Never' : Date.now() + ms(newDuration),
                    'warnings.$.duration':
                        newDuration === 'permanent' ? 'Permanent' : client.util.duration(`${ms(newDuration)}`)
                }
            }
        );

        if (punishment.type !== 'Warn') {
            await punishmentSchema.updateOne(
                {
                    guildID: interaction.guild.id,
                    type: punishment.type[0].toLowerCase() + punishment.type.slice(1),
                    userID: punishment.userID
                },
                {
                    expires: newDuration === 'permanent' ? 'Never' : Date.now() + ms(newDuration)
                }
            );
        }

        return interaction.reply(
            `Successfully updated duration for punishment \`${punishmentID}\` to \`${
                newDuration === 'permanent' ? 'permanent' : client.util.duration(ms(newDuration))
            }\``
        );
    }
};
