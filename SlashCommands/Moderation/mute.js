const Discord = require('discord.js');
const ms = require('ms');
const settingsSchema = require('../../schemas/settings-schema');
const warningSchema = require('../../schemas/warning-schema');
const punishmentSchema = require('../../schemas/punishment-schema');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'mute',
    description: 'Mutes a member denying their permission to speak in the rest of the server',
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mutes a member denying their permission to speak in the rest of the server')
        .addUserOption(option => option.setName('user').setDescription('The user to mute').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('The duration of the mute'))
        .addStringOption(option => option.setName('reason').setDescription('The reason for muting the user')),
    permissions: Discord.Permissions.FLAGS.MANAGE_ROLES,
    requiredBotPermissions: Discord.Permissions.FLAGS.MANAGE_ROLES,
    async execute(client, interaction, args) {
        const settings = await settingsSchema.findOne({
            guildID: interaction.guild.id
        });

        const { muterole, delModCmds, removerolesonmute } = settings;

        const member = await client.util.getMember(interaction.guild, args['user']);
        if (member && member.permissions.has(Discord.Permissions.FLAGS.MANAGE_ROLES) && !removerolesonmute)
            return client.util.throwError(
                interaction,
                'This command may not be effective on this member | If you have the **Remove Roles On Mute** module enabled, this may work'
            );

        const time = args['duration'] ? ms(args['duration']) : null;
        if (time && time > 315576000000) return client.util.throwError(interaction, client.config.errors.time_too_long);
        const reason = args['reason'] || 'Unspecified';

        const punishmentID = client.util.createSnowflake();

        if (!member) {
            const user = await client.util.getUser(client, args['user']);

            let hasMuteRecord = await punishmentSchema.findOne({
                guildID: interaction.guild.id,
                userID: user.id,
                type: 'mute'
            });

            if (hasMuteRecord) return client.util.throwError(interaction, 'this user already currently muted');

            await client.punishmentManager.createInfraction(client, 'Mute', interaction, interaction.member, user, {
                reason: reason,
                punishmentID: punishmentID,
                time: time,
                auto: false
            });
            await client.punishmentManager.createPunishment(
                interaction.guild.name,
                interaction.guild.id,
                'mute',
                user.id,
                {
                    reason: reason,
                    time: time ? Date.now() + time : 'Never'
                }
            );
            await client.punishmentManager.createModerationLog(
                client,
                'Muted',
                interaction.member,
                user,
                interaction.channel,
                {
                    reason: reason,
                    duration: time,
                    punishmentID: punishmentID
                }
            );

            return interaction.reply(
                `**${user.tag}** has been muted. They are not currently on the server, but if they join they will be muted`
            );
        }

        if (!member) return client.util.throwError(interaction, client.config.errors.invalid_member);

        if (member instanceof Discord.GuildMember) {
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
        }

        let hasMuteRecord = await punishmentSchema.findOne({
            guildID: interaction.guild.id,
            userID: member.id,
            type: 'mute'
        });

        const role = interaction.guild.roles.cache.get(muterole) || (await client.util.createMuteRole(interaction));
        if (!role)
            return client.util.throwError(
                interaction,
                'the muted role was not found, so I tried to create one, but I failed due to bad permissions'
            );
        if (role.id !== muterole) client.cache.settings.delete(interaction.guild.id);

        if (role.position >= interaction.guild.me.roles.highest.position)
            return client.util.throwError(interaction, 'my hierarchy is too low to manage the muted role');

        if (member.roles.cache.has(role.id))
            return client.util.throwError(interaction, 'this user is already currently muted!');
        else if (hasMuteRecord) {
            await punishmentSchema.deleteMany({
                guildID: interaction.guild.id,
                userID: member.id,
                type: 'mute'
            });

            const guildWarnings = await warningSchema.findOne({ guildID: interaction.guild.id });

            if (guildWarnings?.warnings?.length) {
                const mutesToExpire = guildWarnings.warnings.filter(
                    warning => warning.expires > Date.now() && warning.type === 'Mute' && warning.userID === member.id
                );

                for (let i = 0; i !== mutesToExpire.length; ++i) {
                    const mute = mutesToExpire[i];

                    await warningSchema.updateOne(
                        {
                            guildID: interaction.guild.id,
                            warnings: {
                                $elemMatch: {
                                    punishmentID: mute.punishmentID
                                }
                            }
                        },
                        {
                            $set: {
                                'warnings.$.expires': Date.now()
                            }
                        }
                    );
                }
            }
        }

        const memberRoles = removerolesonmute ? member.roles.cache.map(roles => roles.id) : [];
        const unmanagableRoles = member.roles.cache.filter(role => role.managed).map(roles => roles.id);

        if (removerolesonmute) {
            await member.voice.disconnect().catch(() => {});
            await member.roles.set([role, ...unmanagableRoles]);
        } else await client.util.muteMember(interaction, member, role);

        await client.punishmentManager.createInfraction(client, 'Mute', interaction, interaction.member, member, {
            reason: reason,
            punishmentID: punishmentID,
            time: time,
            auto: false
        });
        await client.punishmentManager.createPunishment(
            interaction.guild.name,
            interaction.guild.id,
            'mute',
            member.id,
            {
                reason: reason,
                time: time ? Date.now() + time : 'Never',
                roles: memberRoles
            }
        );
        await client.punishmentManager.createUserInfractionDM(
            client,
            'muted',
            client.config.colors.punishment[1],
            interaction,
            member,
            {
                reason: reason,
                punishmentID: punishmentID,
                time: time
            }
        );
        await client.punishmentManager.createModerationLog(
            client,
            'Muted',
            interaction.member,
            member,
            interaction.channel,
            {
                reason: reason,
                duration: time,
                punishmentID: punishmentID
            }
        );

        const mutedEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.punishment[1])
            .setDescription(`✅ ${member.toString()} has been muted with ID \`${punishmentID}\``);

        if (delModCmds) {
            await interaction.reply({ content: `Successfully muted member ${member}`, ephemeral: true });
            return interaction.channel.send({
                embeds: [
                    new Discord.MessageEmbed()
                        .setColor(client.config.colors.punishment[1])
                        .setDescription(
                            `${
                                client.config.emotes.success
                            } ${member.toString()} has been muted with ID \`${punishmentID}\``
                        )
                ]
            });
        }

        return interaction.reply({ embeds: [mutedEmbed] });
    }
};
