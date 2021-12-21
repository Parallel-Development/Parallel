const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const settingsSchema = require('../../schemas/settings-schema');
const lockSchema = require('../../schemas/lock-schema');

module.exports = {
    name: 'lockserver',
    description:
        'Lock all server channels. The bot will ignore channels in which non-moderators cannot talk in or view',
    data: new SlashCommandBuilder()
        .setName('lockserver')
        .setDescription(
            'Lock all server channels. The bot will ignore channels in which non-mods cannot talk in or view'
        )
        .addBooleanOption(option =>
            option
                .setName('include_staff_channels')
                .setDescription('Include channels non-moderators cannot talk in or view')
        ),
    permissions: Discord.Permissions.FLAGS.ADMINISTRATOR,
    requiredBotPermissions: Discord.Permissions.FLAGS.ADMINISTRATOR,
    async execute(client, interaction, args) {
        if (global.lockdownCooldown.has(interaction.guild.id))
            return client.util.throwError(
                interaction,
                'this server is currently under a lock or unlock process, please wait for it to complete before running this command'
            );

        const includeStaffChannels = args['include_staff_channels'] === true;

        const guildSettings = await settingsSchema.findOne({ guildID: interaction.guild.id });
        const { modRoles } = guildSettings;
        const guildLocked = await lockSchema.findOne({ guildID: interaction.guild.id });
        const allChannels = interaction.guild.channels.cache.filter(channel => channel.type === 'GUILD_TEXT');

        let channels;

        // We check if the channel is not locked now, however we also check in the loop in case a channel is locked while channels are being locked

        if (includeStaffChannels)
            channels = [...allChannels.values()].filter(channel =>
                channel.permissionOverwrites.cache
                    .filter(overwrite => overwrite.type === 'role')
                    .some(
                        overwrite =>
                            channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.SEND_MESSAGES) &&
                            channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.VIEW_CHANNEL)
                    )
            );
        else
            channels = [...allChannels.values()].filter(channel => {
                if (!channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id)) return true;
                else
                    return channel.permissionOverwrites.cache
                        .filter(overwrite => overwrite.type === 'role')
                        .some(
                            overwrite =>
                                !interaction.guild.roles.cache
                                    .get(overwrite.id)
                                    .permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
                                !modRoles.includes(overwrite.id) &&
                                channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.SEND_MESSAGES) &&
                                channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.VIEW_CHANNEL)
                        );
            });

        const guildLockedChannelIds = guildLocked.channels.map(info => info.ID);
        if (channels.every(channel => guildLockedChannelIds.includes(channel.id)))
            return client.util.throwError(
                interaction,
                'all the target channels are already locked, there are none to lock!'
            );
        if (!channels.length)
            return client.util.throwError(interaction, 'none of the target channels will change after locked');

        const done = async () => new Promise(resolve => setTimeout(resolve, 1000));

        let lockedChannelsCount = 0;
        let displayChannelsToLock = channels.length;

        global.lockdownCooldown.add(interaction.guild.id);

        await interaction.deferReply();
        await interaction.editReply(
            `Locking the server...\n\n**${lockedChannelsCount}/${displayChannelsToLock}** channels completed - ${Math.round(
                (lockedChannelsCount / displayChannelsToLock || 0) * 100
            )}%\n\nExpected time left: \`${client.util.duration(
                (displayChannelsToLock - lockedChannelsCount) * 1000
            )}\``
        );

        await done();

        for (let i = 0; i !== channels.length; ++i) {
            const channel = channels[i];
            const checkIfLocked = await lockSchema.findOne({
                guildID: interaction.guild.id,
                channels: { $elemMatch: { ID: channel.id } }
            });
            const me = client.guilds.cache.get(interaction.guild.id).me;

            if (!me.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)) {
                interaction
                    .editReply(
                        'The locking process has been automatically halted! I require Administrator to ensure I can update channel overrides. Please give me the administrator permission and run the command again'
                    )
                    .catch(() =>
                        interaction.channel
                            .send(
                                'The locking process has been automatically halted! I require Administrator to ensure I can update channel overrides. Please give me the administrator permission and run the command again'
                            )
                            .catch(() => {})
                    );
                global.lockdownCooldown.delete(interaction.guild.id);
                return;
            }

            if (!checkIfLocked && client.guilds.cache.get(interaction.guild.id).channels.cache.get(channel.id)) {
                const permissionOverwrites = channel.permissionOverwrites.cache;

                // The permissions that the channel will be set to in the end;
                let newPermissionOverwrites = permissionOverwrites;

                const enabledOverwrites = [...permissionOverwrites.values()].filter(
                    overwrite =>
                        overwrite.type === 'role' &&
                        !channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
                        !overwrite.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) &&
                        !modRoles.includes(overwrite.id) &&
                        overwrite.allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES)
                );

                let neutralOverwrites = [...permissionOverwrites.values()].filter(
                    overwrite =>
                        overwrite.type === 'role' &&
                        !channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
                        !overwrite.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) &&
                        !modRoles.includes(overwrite.id) &&
                        !overwrite.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) &&
                        !overwrite.allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES)
                );

                const allOverwrites = neutralOverwrites.concat(enabledOverwrites);

                // It is not unexpected that this returns undefined!
                const everyoneRoleOverwrite = channel.permissionOverwrites.cache.get(
                    interaction.guild.roles.everyone.id
                );

                if (!allOverwrites.length && everyoneRoleOverwrite);
                else {
                    newPermissionOverwrites = permissionOverwrites.filter(
                        overwrite =>
                            !enabledOverwrites.some(enabledOverwrite => enabledOverwrite.id === overwrite.id) &&
                            !neutralOverwrites.some(neutralOverwrite => neutralOverwrite.id === overwrite.id) &&
                            overwrite.id !== interaction.guild.roles.everyone.id
                    );

                    if (!everyoneRoleOverwrite) {
                        newPermissionOverwrites.set(interaction.guild.roles.everyone.id, {
                            id: interaction.guild.roles.everyone.id,
                            type: 'role',
                            deny: Discord.Permissions.FLAGS.SEND_MESSAGES,
                            allow: 0n
                        });

                        neutralOverwrites.push(interaction.guild.roles.everyone.id);
                    }

                    for (let i = 0; i !== allOverwrites.length; ++i) {
                        const overwrite = allOverwrites[i];
                        const initialPermissionOverwrite = channel.permissionOverwrites.cache.get(overwrite.id);
                        const newPermissionOverwrite = {
                            id: initialPermissionOverwrite.id,
                            type: initialPermissionOverwrite.type,
                            deny: initialPermissionOverwrite.deny + Discord.Permissions.FLAGS.SEND_MESSAGES,
                            allow: initialPermissionOverwrite.allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES)
                                ? initialPermissionOverwrite.allow - Discord.Permissions.FLAGS.SEND_MESSAGES
                                : initialPermissionOverwrite.allow
                        };

                        newPermissionOverwrites.set(newPermissionOverwrite.id, newPermissionOverwrite);
                    }

                    await channel.permissionOverwrites
                        .set(
                            newPermissionOverwrites,
                            `Command /lockserver ran by ${interaction.user.tag} (${interaction.user.id})`
                        )
                        .catch(async () => await interaction.editReply('Hmm...'));

                    await lockSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            $push: {
                                channels: {
                                    ID: channel.id,
                                    enabledOverwrites: enabledOverwrites,
                                    neutralOverwrites: neutralOverwrites
                                }
                            }
                        }
                    );

                    ++lockedChannelsCount;
                    await interaction
                        .editReply(
                            `Locking the server...\n\n**${lockedChannelsCount}/${displayChannelsToLock}** channels completed - ${Math.round(
                                (lockedChannelsCount / displayChannelsToLock || 0) * 100
                            )}%\n\nExpected time left: \`${client.util.duration(
                                (displayChannelsToLock - lockedChannelsCount) * 1000
                            )}\``
                        )
                        .catch(() => {});
                    await done();
                }
            } else --displayChannelsToLock;
        }

        global.lockdownCooldown.delete(interaction.guild.id);
        return interaction.editReply(`Successfully locked **${displayChannelsToLock}** channels`).catch(() => {
            interaction.channel.send(`Successfully locked **${displayChannelsToLock}** channels`).catch(() => {});
        });
    }
};
