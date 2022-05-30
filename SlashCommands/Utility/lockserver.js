const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const settingsSchema = require('../../schemas/settings-schema');
const lockSchema = require('../../schemas/lock-schema');
const { MessageActionRow, MessageButton, MessageEmbed, Permissions } = require('discord.js');

module.exports = {
    name: 'lockserver',
    description:
        'Lock all server channels. The bot will ignore channels in which non-moderators cannot talk in or view',
    data: new SlashCommandBuilder()
        .setName('lockserver')
        .setDescription(
            'Lock all server channels. The bot will ignore channels in which non-mods cannot talk in or view'
        )
        .addStringOption(option => option.setName('reason').setDescription('The reason for locking the server'))
        .addChannelOption(option =>
            option.setName('channel').setDescription('The channel that will be informed about the server lock')
        )
        .addBooleanOption(option =>
            option
                .setName('inform_locked_channels')
                .setDescription('Inform all locked channels that the server was locked')
        )
        .addStringOption(option =>
            option.setName('ignored_channels').setDescription('A list of channels to ignore when locking the server')
        ),
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    requiredBotPermissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    async execute(client, interaction, args) {
        if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_ROLES))
            return interaction.reply('You need the `Manage Roles` permission as well to execute this command');

        if (!interaction.guild.me.permissions.has(Permissions.FLAGS.MANAGE_ROLES))
            return interaction.reply('I need the `Manage Roles` permission as well to execute this command');

        const ignoredChannels =
            args.ignored_channels
                ?.trim()
                .split(' ')
                .map(ch => client.util.getChannel(interaction.guild, ch))
                .filter(ch => ch && ch.isText() && !ch.isThread())
                .map(ch => ch.id) ?? [];
        const informLockedChannels = Boolean(args.inform_locked_channels);
        const informedChannel = client.util.getChannel(interaction.guild, args.channel);

        if (informedChannel && !informedChannel.isText()) {
            if (!informedChannel.isText())
                return client.util.throwError(interaction, 'the informed channel must be a text channel');
            if (
                !informedChannel
                    .permissionsFor(message.guild.me)
                    .has([Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.EMBED_LINKS])
            )
                return client.util.throwError(
                    message,
                    'I cannot send messages and/or embed links in the target informed channel'
                );
        }

        const guildSettings = await settingsSchema.findOne({ guildID: interaction.guild.id });
        const { modRoles } = guildSettings;

        const reason = args.reason;

        const failedChannels = [];

        const channels = [
            ...interaction.guild.channels.cache
                .filter(channel => {
                    if (!channel.isText() || channel.isThread()) return false;

                    if (ignoredChannels.includes(channel.id)) return false;

                    if (
                        !channel
                            .permissionsFor(interaction.member)
                            .has([
                                Permissions.FLAGS.MANAGE_CHANNELS,
                                Permissions.FLAGS.MANAGE_ROLES,
                                Permissions.FLAGS.VIEW_CHANNEL
                            ])
                    )
                        return failedChannels.push({ channel, reason: 'you:basic' }), false;

                    if (
                        !channel
                            .permissionsFor(interaction.guild.me)
                            .has([
                                Permissions.FLAGS.MANAGE_CHANNELS,
                                Permissions.FLAGS.MANAGE_ROLES,
                                Permissions.FLAGS.VIEW_CHANNEL
                            ])
                    )
                        return failedChannels.push({ channel, reason: 'me:basic' }), false;

                    const _targetOverwrites = channel.permissionOverwrites.cache
                        .filter(overwrite => {
                            const role = interaction.guild.roles.cache.get(overwrite.id);
                            if (!role) return false;
                            return overwrite.id === interaction.guild.id
                                ? !overwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                                : !role.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES) &&
                                      overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES) &&
                                      !interaction.member.roles.cache.some(role => modRoles.includes(role.id));
                        })
                        .map(overwrite => {
                            return {
                                id: overwrite.id,
                                type: 'role',
                                allow: overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES)
                                    ? overwrite.allow.bitfield - Permissions.FLAGS.SEND_MESSAGES
                                    : overwrite.allow.bitfield,
                                deny: overwrite.deny.bitfield + Permissions.FLAGS.SEND_MESSAGES
                            };
                        });

                    if (!_targetOverwrites.some(overwrite => overwrite.id === interaction.guild.id)) {
                        const everyoneOverwrite = channel.permissionOverwrites.cache.get(interaction.guild.id);
                        if (!everyoneOverwrite || !everyoneOverwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES))
                            _targetOverwrites.push({
                                id: interaction.guild.id,
                                type: 'role',
                                allow: 0n,
                                deny: Permissions.FLAGS.SEND_MESSAGES
                            });
                    }

                    if (
                        !_targetOverwrites.length ||
                        (!channel.permissionsFor(interaction.guild.id).has(Permissions.FLAGS.VIEW_CHANNEL) &&
                            interaction.guild.roles.cache
                                .filter(role => role.id !== interaction.guild.id)
                                .every(
                                    role =>
                                        role.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES) ||
                                        !channel.permissionsFor(role.id).has(Permissions.FLAGS.VIEW_CHANNEL)
                                )) ||
                        (!channel.permissionsFor(interaction.guild.id).has(Permissions.FLAGS.SEND_MESSAGES) &&
                            !interaction.guild.roles.cache.some(
                                role =>
                                    channel.permissionsFor(role.id).has(Permissions.FLAGS.SEND_MESSAGES) &&
                                    !channel.permissionsFor(role.id).has(Permissions.FLAGS.MANAGE_MESSAGES)
                            ))
                    )
                        return false;

                    if (
                        !interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
                        !channel.permissionOverwrites.cache.some(overwrite => {
                            if (
                                interaction.member.roles.cache.some(
                                    role =>
                                        overwrite.id === role.id &&
                                        overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES) &&
                                        !_targetOverwrites.some(o => o.id === overwrite.id)
                                )
                            )
                                return true;

                            return (
                                overwrite.id === interaction.member.id &&
                                overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES)
                            );
                        })
                    )
                        return failedChannels.push({ channel, reason: 'you' }), false;

                    if (
                        !interaction.guild.me.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
                        !channel.permissionOverwrites.cache.some(overwrite => {
                            if (
                                interaction.guild.me.roles.cache.some(
                                    role =>
                                        overwrite.id === role.id &&
                                        overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES) &&
                                        !_targetOverwrites.some(o => o.id === overwrite.id)
                                )
                            )
                                return true;

                            return (
                                overwrite.id === interaction.guild.me.id &&
                                overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES)
                            );
                        })
                    )
                        return failedChannels.push({ channel, reason: 'me' }), false;

                    return true;
                })
                .values()
        ];

        if (failedChannels.length) {
            let yourFailed = failedChannels.filter(fail => fail.reason === 'you').map(fail => fail.channel);

            yourFailed =
                yourFailed.length == 0
                    ? ''
                    : yourFailed.length == 1
                    ? yourFailed[0].toString()
                    : yourFailed.slice(0, -1).join(', ') +
                      `${yourFailed.length != 2 ? ',' : ''} and ${yourFailed.slice(-1)}`;

            let myFailed = failedChannels.filter(fail => fail.reason === 'me').map(fail => fail.channel);

            myFailed =
                myFailed.length == 0
                    ? ''
                    : myFailed.length == 1
                    ? myFailed[0].toString()
                    : myFailed.slice(0, -1).join(', ') + `${myFailed.length != 2 ? ',' : ''} and ${myFailed.slice(-1)}`;

            let yourBasicFailed = failedChannels.filter(fail => fail.reason === 'you:basic').map(fail => fail.channel);

            yourBasicFailed =
                yourBasicFailed.length == 0
                    ? ''
                    : yourBasicFailed.length == 1
                    ? yourBasicFailed[0].toString()
                    : yourBasicFailed.slice(0, -1).join(', ') +
                      `${yourBasicFailed.length != 2 ? ',' : ''} and ${yourBasicFailed.slice(-1)}`;

            let myBasicFailed = failedChannels.filter(fail => fail.reason === 'me:basic').map(fail => fail.channel);

            myBasicFailed =
                myBasicFailed.length == 0
                    ? ''
                    : myBasicFailed.length == 1
                    ? myBasicFailed[0].toString()
                    : myBasicFailed.slice(0, -1).join(', ') +
                      `${myBasicFailed.length != 2 ? ',' : ''} and ${myBasicFailed.slice(-1)}`;

            const failEmbed = new MessageEmbed()
                .setColor(client.config.colors.punishment[1])
                .setAuthor('Warning')
                .setDescription(
                    "Some channels could not be locked. Here's more information.\n\n" +
                        (yourBasicFailed
                            ? `${yourBasicFailed} could not be locked due to you lacking either the Manage Channels and Roles permission or simply the View Channel permission\n\n`
                            : '') +
                        (myBasicFailed
                            ? `${myBasicFailed} could not be locked due to me lacking either the Manage Channels and Roles permission or simply the View Channel permission\n\n`
                            : '') +
                        (yourFailed
                            ? `${yourFailed} could not be locked due to you not having an overwrite in those channels that isn't a target that has the Send Messages permission\n\n`
                            : '') +
                        (myFailed
                            ? `${myFailed} could not be locked due to me not having an overwrite in those channels that isn't a target that has the Send Messages permission\n\n`
                            : '')
                )
                .addField(
                    'Solution',
                    `If you don\'t want to lock these channels, specify they are on the ignored channel list with the \`--ignored-channels\` flag. Example: \`--ignored-channels="#general #announcements"\`${
                        channels.length
                            ? '. If you want to proceed to lock only all the channels that you have permission to lock, press the "Continue anyway" button'
                            : ''
                    }`
                );

            const continueAnyway = new MessageButton()
                .setLabel('Continue anyway')
                .setStyle('SUCCESS')
                .setCustomId('lockserver:continue');
            const cancel = new MessageButton().setLabel('Cancel').setStyle('DANGER').setCustomId('lockserver:cancel');
            const row = new MessageActionRow().addComponents(continueAnyway, cancel);

            //const msg = await interaction.reply({ embeds: [failEmbed], components: channels.length ? [row] : [] });
            await interaction.reply({ embeds: [failEmbed], components: channels.length ? [row] : [] });
            const msg = await interaction.fetchReply();
            const collector = msg.createMessageComponentCollector({ time: 62000 });

            continueAnyway.setDisabled(true), cancel.setDisabled(true);
            const newRow = new MessageActionRow().addComponents(continueAnyway, cancel);

            collector.on('collect', async _interaction => {
                if (_interaction.user.id !== interaction.user.id)
                    return void client.util.throwError(interaction, 'You cannot use this button.');
                await _interaction.update({ components: [newRow] });

                if (_interaction.customId === 'lockserver:cancel') return collector.stop();
                else if (_interaction.customId === 'lockserver:continue') {
                    const forged = msg;
                    forged.content = `${client.cache.settings.get(interaction.guild.id).prefix}lockserver ${
                        informedChannel ?? ''
                    } ${reason || ''} ${
                        informLockedChannels ? '--inform-locked-channels' : ''
                    } --ignored-channels="${ignoredChannels
                        .concat(failedChannels.map(fail => fail.channel.id))
                        .join(' ')}"`;

                    return void client.commands
                        .get('lockserver')
                        .execute(client, forged, forged.content.split(' ').slice(1));
                }
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time' && channels.length) void msg.edit({ components: [newRow] });
            });

            return;
        }

        if (!channels.length) return client.util.throwError(interaction, 'all channels are already in a locked state.');

        const stopBtn = new MessageButton().setLabel('Stop').setStyle('DANGER').setCustomId('lockserver:stop');
        const row = new MessageActionRow().addComponents(stopBtn);

        let uneditable = false;
        await interaction.reply({
            content: `Locking server... **[1/${channels.length}]** • ${channels[0].toString()}`,
            components: [row]
        });
        const lockMsg = await interaction.fetchReply();
        let failed = 0;
        let halt = false;

        // we set a rather high collector timeout. This timeout is supposed to be stopped, but in the case an error occurs, at least it'll be stopped eventually
        const collector = lockMsg.createMessageComponentCollector({ time: 600000 });
        collector.on('collect', async _interaction => {
            if (_interaction.user.id !== interaction.user.id)
                return void client.util.throwError(_interaction, 'You cannot use this button.');

            if (_interaction.customId === 'lockserver:stop') {
                collector.stop();
                halt = true;
                return;
            }
        });

        for (let i = 0; i < channels.length; ++i) {
            if (halt) return lockMsg?.edit({ content: 'Server lock forcefully stopped.', components: [] });
            const channel = channels[i];

            const targetOverwrites = channel.permissionOverwrites.cache.filter(overwrite => {
                const role = interaction.guild.roles.cache.get(overwrite.id);
                if (!role) return false;
                return overwrite.id === interaction.guild.id
                    ? !overwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                    : !role.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES) &&
                          overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES) &&
                          !modRoles.includes(overwrite.id);
            });

            const updatedOverwrites = targetOverwrites.map(overwrite => {
                return {
                    id: overwrite.id,
                    type: 'role',
                    allow: overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES)
                        ? overwrite.allow.bitfield - Permissions.FLAGS.SEND_MESSAGES
                        : overwrite.allow.bitfield,
                    deny: overwrite.deny.bitfield + Permissions.FLAGS.SEND_MESSAGES
                };
            });

            if (!updatedOverwrites.some(overwrite => overwrite.id === interaction.guild.id)) {
                const everyoneOverwrite = channel.permissionOverwrites.cache.get(interaction.guild.id);
                if (!everyoneOverwrite || !everyoneOverwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES))
                    updatedOverwrites.push({
                        id: interaction.guild.id,
                        type: 'role',
                        allow: 0n,
                        deny: Permissions.FLAGS.SEND_MESSAGES
                    });
            }

            if (!updatedOverwrites.length) {
                channels.splice(channels.indexOf(channel), 1);
                i--;
                continue;
            }

            const newOverwrites = [
                ...updatedOverwrites,
                ...channel.permissionOverwrites.cache
                    .filter(overwrite => !updatedOverwrites.some(o => o.id === overwrite.id))
                    .map(overwrite => {
                        return {
                            id: overwrite.id,
                            type: overwrite.type,
                            allow: overwrite.allow.bitfield,
                            deny: overwrite.deny.bitfield
                        };
                    })
            ];

            try {
                await channel.permissionOverwrites.set(
                    newOverwrites,
                    `Locked by ${interaction.user.tag} with the lockserver command ${
                        reason ? `| ${await client.util.contentOrBin(reason)}` : ''
                    }`
                );
            } catch {
                channels.splice(i, 1);
                i--;
                ++failed;
                if (failed == 3) {
                    if (!uneditable)
                        await lockMsg
                            ?.edit({
                                content:
                                    'The server lock was halted due to the error threshold of **3** being reached. Did my permissions change during the lock?',
                                components: []
                            })
                            .catch(() => {});
                    else
                        await interaction.channel
                            .send(
                                'The server lock was halted due to the error threshold of **3** being reached. Did my permissions change during the lock?'
                            )
                            .catch(() => {});

                    collector.stop();
                    return;
                }
                continue;
            }

            const lockInformation = await lockSchema.findOne({ guildID: interaction.guild.id });
            const isLocked = lockInformation?.channels.some(ch => ch.id === channel.id);

            const allowedOverwrites = targetOverwrites
                .filter(overwrite => overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES))
                .map(overwrite => overwrite.id);
            const everyoneRoleType = targetOverwrites
                .get(interaction.guild.id)
                ?.allow.has(Permissions.FLAGS.SEND_MESSAGES)
                ? 'allowed'
                : targetOverwrites.get(interaction.guild.id)?.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                ? 'denied'
                : 'neutral';
            const data = {
                id: channel.id,
                allowedOverwrites,
                everyoneRoleType: everyoneRoleType
            };

            if (informLockedChannels === true) await channel.send('This channel has been locked from a server lock');

            if (isLocked) {
                const newLocked = [...lockInformation.channels.filter(ch => ch.id !== channel.id), data];
                await lockSchema.updateOne({ guildID: interaction.guild.id }, { channels: newLocked });
            } else await lockSchema.updateOne({ guildID: interaction.guild.id }, { $push: { channels: data } });

            if (i == 0) continue;

            if (!uneditable)
                await lockMsg
                    ?.edit(`Locking server... **[${i + 1}/${channels.length}]** • ${channels[i]?.toString()}`)
                    .catch(() => (uneditable = true));
            else if (i % 5 == 0) {
                uneditable = false;
                lockMsg = await interaction.channel
                    .send(`Locking server... **[${i + 1}/${channels.length}]** • ${channels[i]?.toString()}`)
                    .catch(() => ((uneditable = true), (lockMsg = undefined)));
            }

            await this.sleep(1000);
        }

        collector.stop();

        if (!uneditable)
            await lockMsg
                ?.edit({
                    content: `Server lock completed, locked **${channels.length}** channel${
                        channels.length == 1 ? '' : 's'
                    }${failed > 0 ? `, but failed to lock **${failed}** channel${failed == 1 ? '' : 's'}` : ''}`,
                    components: []
                })
                .catch(() => {});
        else
            interaction.channel
                .send(
                    `Server lock completed, locked **${channels.length}** channel${channels.length == 1 ? '' : 's'}${
                        failed > 0 ? `, but failed to lock **${failed}** channel${failed == 1 ? '' : 's'}` : ''
                    }`
                )
                .catch(() => {});

        if (informedChannel) {
            const lockedServerEmbed = new MessageEmbed()
                .setColor(client.config.colors.punishment[1])
                .setAuthor('Server Locked', client.user.displayAvatarURL())
                .setTitle('This server has been locked');
            if (reason) lockedServerEmbed.setDescription(await client.util.contentOrBin(reason));

            await informedChannel.send({ embeds: [lockedServerEmbed] });
        }
    },

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
