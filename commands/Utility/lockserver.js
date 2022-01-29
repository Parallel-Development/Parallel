const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const lockSchema = require('../../schemas/lock-schema');
const {
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    Permissions,
} = require('discord.js');

module.exports = {
    name: 'lockserver',
    description:
        'Lock all server channels. The bot will ignore channels in which non-moderators cannot talk in or view',
    usage: 'lockserver [informed-channel]\n\nFlags: `--inform-locked-channels`, `--ignored-channels="#test #test2 ..."`',
    aliases: ['lockall'],
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    requiredBotPermissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    aliases: ['lockall'],
    async execute(client, message, args) {
        const _ignoredChannels = client.util.getFlag(message.content, 'ignored-channels');
        const informLockedChannels = client.util.getFlag(message.content, 'inform-locked-channels');
        const ignoredChannels =
            typeof _ignoredChannels?.value === 'string'
                ? _ignoredChannels?.value
                    .trim()
                    .split(' ')
                    .map(ch => client.util.getChannel(message.guild, ch))
                    .filter(ch => ch && ch.isText() && !ch.isThread())
                    .map(ch => ch.id)
                : [];
        if (_ignoredChannels?.value)
            args.splice(
                args.indexOf(_ignoredChannels.formatted.split(' ')[0]),
                _ignoredChannels.formatted.split(' ').length
            );
        if (informLockedChannels?.value)
            args.splice(
                args.indexOf(informLockedChannels.formatted.split(' ')[0]),
                informLockedChannels.formatted.split(' ').length
            );

        const informedChannel = client.util.getChannel(message.guild, args[0]);
        if (informedChannel) {
            if (!informedChannel.isText())
                return client.util.throwError(message, 'the channel must be a text channel');
            args.shift();
        }

        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
        const { modRoles } = guildSettings;

        const reason = args.join(' ');

        const failedChannels = [];

        const channels = [
            ...message
                .guild.channels.cache.filter(channel => {
                    if (!channel.isText() || channel.isThread()) return false;

                    if (ignoredChannels.includes(channel.id)) return false;

                    if (
                        !channel
                            .permissionsFor(message.member)
                            .has([
                                Permissions.FLAGS.MANAGE_CHANNELS,
                                Permissions.FLAGS.MANAGE_ROLES,
                                Permissions.FLAGS.VIEW_CHANNEL
                            ])
                    )
                        return failedChannels.push({ channel, reason: 'you:basic' }), false;

                    if (
                        !channel
                            .permissionsFor(message.guild.me)
                            .has([
                                Permissions.FLAGS.MANAGE_CHANNELS,
                                Permissions.FLAGS.MANAGE_ROLES,
                                Permissions.FLAGS.VIEW_CHANNEL
                            ])
                    )
                        return failedChannels.push({ channel, reason: 'me:basic' }), false;

                    const _targetOverwrites = channel.permissionOverwrites.cache
                        .filter(overwrite => {
                            const role = message.guild.roles.cache.get(overwrite.id);
                            if (!role) return false;
                            return overwrite.id === message.guild.id
                                ? !overwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                                : !role.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES) &&
                                overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES) &&
                                !message.member.roles.cache.some(role => modRoles.includes(role.id))
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

                    if (!_targetOverwrites.some(overwrite => overwrite.id === message.guild.id)) {
                        const everyoneOverwrite = channel.permissionOverwrites.cache.get(
                            message.guild.id
                        );
                        if (!everyoneOverwrite || !everyoneOverwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES))
                            _targetOverwrites.push({
                                id: message.guild.id,
                                type: 'role',
                                allow: 0n,
                                deny: Permissions.FLAGS.SEND_MESSAGES
                            });
                    }

                    if (
                        !_targetOverwrites.length ||
                        (!channel.permissionsFor(message.guild.id).has(Permissions.FLAGS.VIEW_CHANNEL) &&
                            channel.permissionOverwrites.cache
                                .filter(overwrite => overwrite.type === 'role' && overwrite.id !== message.guild.id)
                                .every(
                                    overwrite =>
                                        message
                                            .guild.roles.cache.get(overwrite.id)
                                            .permissions.has(Permissions.FLAGS.MANAGE_MESSAGES) ||
                                        !channel.permissionsFor(overwrite.id).has(Permissions.FLAGS.VIEW_CHANNEL)
                                )) ||
                        (!channel.permissionsFor(message.guild.id).has(Permissions.FLAGS.SEND_MESSAGES) &&
                            !message.guild.roles.cache.some(
                                role =>
                                    channel.permissionsFor(role.id).has(Permissions.FLAGS.SEND_MESSAGES) &&
                                    !channel.permissionsFor(role.id).has(Permissions.FLAGS.MANAGE_MESSAGES)
                            ))
                    )
                        return false;

                    if (
                        !message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
                        !channel.permissionOverwrites.cache.some(overwrite => {
                            if (
                                message.member.roles.cache.some(
                                    role =>
                                        overwrite.id === role.id &&
                                        overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES) &&
                                        !_targetOverwrites.some(o => o.id === overwrite.id)
                                )
                            )
                                return true;

                            return (
                                overwrite.id === message.member.id &&
                                overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES)
                            );
                        })
                    )
                        return failedChannels.push({ channel, reason: 'you' }), false;

                    if (channel.id === '934218047877677111') console.log(_targetOverwrites);

                    if (
                        !message.guild.me.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
                        !channel.permissionOverwrites.cache.some(overwrite => {
                            if (
                                message.guild.me.roles.cache.some(
                                    role =>
                                        overwrite.id === role.id &&
                                        overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES) &&
                                        !_targetOverwrites.some(o => o.id === overwrite.id)
                                )
                            )
                                return true;

                            return (
                                overwrite.id === message.guild.me.id &&
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
            let yourFailed = failedChannels
                .filter(fail => fail.reason === 'you')
                .map(fail => fail.channel);

            yourFailed =
                yourFailed.length == 0
                    ? ''
                    : yourFailed.length == 1
                        ? yourFailed[0].toString()
                        : yourFailed.slice(0, -1).join(', ') +
                        `${yourFailed.length != 2 ? ',' : ''} and ${yourFailed.slice(-1)}`;

            let myFailed = failedChannels
                .filter(fail => fail.reason === 'me')
                .map(fail => fail.channel);

            myFailed =
                myFailed.length == 0
                    ? ''
                    : myFailed.length == 1
                        ? myFailed[0].toString()
                        : myFailed.slice(0, -1).join(', ') + `${myFailed.length != 2 ? ',' : ''} and ${myFailed.slice(-1)}`;

            let yourBasicFailed = failedChannels
                .filter(fail => fail.reason === 'you:basic')
                .map(fail => fail.channel);

            yourBasicFailed =
                yourBasicFailed.length == 0
                    ? ''
                    : yourBasicFailed.length == 1
                        ? yourBasicFailed[0].toString()
                        : yourBasicFailed.slice(0, -1).join(', ') +
                        `${yourBasicFailed.length != 2 ? ',' : ''} and ${yourBasicFailed.slice(-1)}`;

            let myBasicFailed = failedChannels
                .filter(fail => fail.reason === 'me:basic')
                .map(fail => fail.channel);

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
                    `If you don\'t want to lock these channels, specify they are on the ignored channel list with the \`--ignored-channels\` flag. Example: \`--ignored-channels="#general #announcements"\`${channels.length
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

            const msg = await message.reply({ embeds: [failEmbed], components: channels.length ? [row] : [] });
            const collector = msg.createMessageComponentCollector({ time: 62000 });

            continueAnyway.setDisabled(true), cancel.setDisabled(true);
            const newRow = new MessageActionRow().addComponents(continueAnyway, cancel);

            collector.on('collect', async interaction => {
                if (interaction.user.id !== message.author.id)
                    return void client.util.throwError(interaction, 'You cannot use this button.');
                await interaction.update({ components: [newRow] });

                if (interaction.customId === 'lockserver:cancel') return collector.stop();
                else if (interaction.customId === 'lockserver:continue') {
                    const forged = message;
                    forged.content = `${client.cache.settings.get(message.guild.id).prefix}lockserver ${informedChannel ?? ''
                        } ${reason || ''} ${informLockedChannels ? '--inform-locked-channels' : ''
                        } --ignored-channels="${ignoredChannels
                            .concat(failedChannels.map(fail => fail.channel.id))
                            .join(' ')}"`;
                    return void this.execute(client, forged, forged.content.split(' ').slice(1));
                }
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time' && channels.length) void msg.edit({ components: [newRow] });
            });

            return;
        }

        if (!channels.length) return client.util.throwError(message, 'all channels are already in a locked state.');

        const stopBtn = new MessageButton().setLabel('Stop').setStyle('DANGER').setCustomId('lockserver:stop');
        const row = new MessageActionRow().addComponents(stopBtn);

        let uneditable = false;
        let lockMsg = await message.reply({
            content: `Locking server... **[1/${channels.length}]** • ${channels[0].toString()}`,
            components: [row]
        });
        let failed = 0;
        let halt = false;

        // we set a rather high collector timeout. This timeout is supposed to be stopped, but in the case an error occurs, at least it'll be stopped eventually
        const collector = lockMsg.createMessageComponentCollector({ time: 600000 });
        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id)
                return void client.util.throwError(interaction, 'You cannot use this button.');

            if (interaction.customId === 'lockserver:stop') {
                collector.stop();
                halt = true;
                return;
            }
        });

        for (let i = 0; i < channels.length; ++i) {
            if (halt) return lockMsg?.edit({ content: 'Server lock forcefully stopped.', components: [] });
            const channel = channels[i];

            const targetOverwrites = channel.permissionOverwrites.cache.filter(overwrite => {
                const role = message.guild.roles.cache.get(overwrite.id);
                if (!role) return false;
                return overwrite.id === message.guild.id
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

            if (!updatedOverwrites.some(overwrite => overwrite.id === message.guild.id)) {
                const everyoneOverwrite = channel.permissionOverwrites.cache.get(message.guild.id);
                if (!everyoneOverwrite || !everyoneOverwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES))
                    updatedOverwrites.push({
                        id: message.guild.id,
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
                    `Locked by ${message.author.tag} with the lockserver command ${reason ? `| ${await client.util.contentOrBin(reason)}` : ''
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
                            .catch(() => { });
                    else
                        await message.channel
                            .send(
                                'The server lock was halted due to the error threshold of **3** being reached. Did my permissions change during the lock?'
                            )
                            .catch(() => { });

                    collector.stop();
                    return;
                }
                continue;
            }

            const lockInformation = await lockSchema.findOne({ guildID: message.guild.id } );
            const isLocked = lockInformation?.channels.some(ch => ch.id === channel.id);

            const allowedOverwrites = targetOverwrites
                .filter(overwrite => overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES))
                .map(overwrite => overwrite.id);
            const everyoneRoleType = targetOverwrites.get(message.guild.id)?.allow.has(Permissions.FLAGS.SEND_MESSAGES)
                ? 'allowed'
                : targetOverwrites.get(message.guild.id)?.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                    ? 'denied'
                    : 'neutral';
            const data = {
                id: channel.id,
                allowedOverwrites,
                everyoneRoleType: everyoneRoleType
            };

            if (informLockedChannels?.value === true)
                await channel.send('This channel has been locked from a server lock');

            if (isLocked) {
                const newLocked = [
                    ...lockInformation.channels.filter(ch => ch.id !== channel.id),
                    data
                ];
                await lockSchema.updateOne({ guildID: message.guild.id },  { channels: newLocked } );
            } else
                await lockSchema.updateOne({ guildID: message.guild.id }, { $push: { channels: data } } );

            if (i == 0) continue;

            if (!uneditable)
                await lockMsg
                    ?.edit(`Locking server... **[${i + 1}/${channels.length}]** • ${channels[i]?.toString()}`)
                    .catch(() => (uneditable = true));
            else if (i % 5 == 0) {
                uneditable = false;
                lockMsg = await message.channel
                    .send(`Locking server... **[${i + 1}/${channels.length}]** • ${channels[i]?.toString()}`)
                    .catch(() => ((uneditable = true), (lockMsg = undefined)));
            }

            await this.sleep(1000);
        }

        collector.stop();

        if (!uneditable)
            await lockMsg
                ?.edit({
                    content: `Server lock completed, locked **${channels.length}** channel${channels.length == 1 ? '' : 's'
                        }${failed > 0 ? `, but failed to lock **${failed}** channel${failed == 1 ? '' : 's'}` : ''}`,
                    components: []
                })
                .catch(() => { });
        else
            message.channel
                .send(
                    `Server lock completed, locked **${channels.length}** channel${channels.length == 1 ? '' : 's'}${failed > 0 ? `, but failed to lock **${failed}** channel${failed == 1 ? '' : 's'}` : ''
                    }`
                )
                .catch(() => { });

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
