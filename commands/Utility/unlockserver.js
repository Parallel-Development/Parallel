const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const lockSchema = require('../../schemas/lock-schema');
const { MessageActionRow, MessageButton, MessageEmbed, Permissions } = require('discord.js');

module.exports = {
    name: 'unlockserver',
    description: 'Unlock all locked channels',
    usage: 'unlockserver',
    aliases: ['unlockall'],
    permissions: Discord.Permissions.FLAGS.ADMINISTRATOR,
    requiredBotPermissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    async execute(client, message, args) {
        const informUnlockedChannels = client.util.getFlag(message.content, 'inform-unlocked-channels');
        const _ignoredChannels = client.util.getFlag(message.content, 'ignored-channels');
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
        if (informUnlockedChannels?.value)
            args.splice(
                args.indexOf(informUnlockedChannels.formatted.split(' ')[0]),
                informUnlockedChannels.formatted.split(' ').length
            );

        const informedChannel = client.util.getChannel(message.guild, args[0]);
        if (informedChannel) {
            if (!informedChannel.isText()) return client.util.throwError(message, 'the channel must be a text channel');
            args.shift();
        }

        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
        const { modRoles } = guildSettings;

        const reason = args.join(' ');

        const guildLocked = await lockSchema.findOne({ guildID: message.guild.id });

        const failedChannels = [];

        const channels = guildLocked.channels
            .filter(_channel => {
                const channel = message.guild.channels.cache.get(_channel.id);

                if (!channel) return false;

                if (ignoredChannels.includes(channel.id)) return false;

                const channelLockData = guildLocked.channels.find(ch => ch.id === channel.id);

                if (!channelLockData) return false;

                const updatedOverwrites = channelLockData.allowedOverwrites
                    .filter(__overwrite => {
                        const overwrite = channel.permissionOverwrites.cache.get(__overwrite);
                        if (!overwrite) return false;
                        return overwrite.id === message.guild.id
                            ? channelLockData.everyoneRoleType === 'allowed'
                                ? overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES)
                                : channelLockData.everyoneRoleType === 'denied' &&
                                  overwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                            : overwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES);
                    })
                    .map(overwrite => {
                        const overwriteData = channel.permissionOverwrites.cache.get(overwrite);
                        return {
                            id: overwrite,
                            type: 'role',
                            allow: !overwriteData.allow.has(Permissions.FLAGS.SEND_MESSAGES)
                                ? overwriteData.allow.bitfield + Permissions.FLAGS.SEND_MESSAGES
                                : overwriteData.allow.bitfield,
                            deny: overwriteData.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                                ? overwriteData.deny.bitfield - Permissions.FLAGS.SEND_MESSAGES
                                : overwriteData.deny.bitfield
                        };
                    });

                if (channelLockData.everyoneRoleType !== 'denied') {
                    const everyoneOverwrite = channel.permissionOverwrites.cache.get(message.guild.id);
                    if (everyoneOverwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES)) {
                        updatedOverwrites.push({
                            id: everyoneOverwrite.id,
                            type: 'role',
                            allow:
                                everyoneOverwrite.allow.bitfield +
                                (channelLockData.everyoneRoleType === 'allowed' ? Permissions.FLAGS.SEND_MESSAGES : 0n),
                            deny: everyoneOverwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                                ? everyoneOverwrite.deny.bitfield - Permissions.FLAGS.SEND_MESSAGES
                                : everyoneOverwrite.deny.bitfield
                        });
                    }
                }

                if (!updatedOverwrites.length) {
                    lockSchema.updateOne(
                        {
                            guildID: message.guild.id
                        },
                        {
                            channels: guildLocked.channels.filter(ch => ch.id !== channel.id)
                        }
                    );

                    return false;
                }

                if (
                    !channel
                        .permissionsFor(message.member)
                        .has([
                            Permissions.FLAGS.MANAGE_CHANNELS,
                            Permissions.FLAGS.MANAGE_ROLES,
                            Permissions.FLAGS.VIEW_CHANNEL
                        ]) &&
                    !message.member.roles.cache.some(role => modRoles.includes(role.id))
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

                if (
                    !message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
                    !message.member.roles.cache.some(role => modRoles.includes(role.id)) &&
                    !channel.permissionOverwrites.cache.some(overwrite => {
                        if (
                            message.member.roles.cache.some(
                                role =>
                                    overwrite.id === role.id &&
                                    overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES) &&
                                    !updatedOverwrites.some(o => o.id === overwrite.id)
                            )
                        )
                            return true;

                        return (
                            overwrite.id === message.member.id && overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES)
                        );
                    })
                )
                    return failedChannels.push({ channel, reason: 'you' }), false;

                if (
                    !message.guild.me.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
                    !channel.permissionOverwrites.cache.some(overwrite => {
                        if (
                            message.guild.me.roles.cache.some(
                                role =>
                                    overwrite.id === role.id &&
                                    overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES) &&
                                    !updatedOverwrites.some(o => o.id === overwrite.id)
                            )
                        )
                            return true;

                        return (
                            overwrite.id === message.guild.me.id && overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES)
                        );
                    })
                )
                    return failedChannels.push({ channel, reason: 'you' }), false;

                return true;
            })
            .map(ch => client.util.getChannel(message.guild, ch.id));

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
                    "Some channels could not be unlocked. Here's more information.\n\n" +
                        (yourBasicFailed
                            ? `${yourBasicFailed} could not be unlocked due to you lacking either the Manage Channels and Roles permission or simply the View Channel permission\n\n`
                            : '') +
                        (myBasicFailed
                            ? `${myBasicFailed} could not be unlocked due to me lacking either the Manage Channels and Roles permission or simply the View Channel permission\n\n`
                            : '') +
                        (yourFailed
                            ? `${yourFailed} could not be unlocked due to you not having an overwrite in those channels that isn't a target that has the Send Messages permission\n\n`
                            : '') +
                        (myFailed
                            ? `${myFailed} could not be unlocked due to me not having an overwrite in those channels that isn't a target that has the Send Messages permission\n\n`
                            : '')
                )
                .addField(
                    'Solution',
                    `If you don\'t want to unlock these channels, specify they are on the ignored channel list with the \`--ignored-channels\` flag. Example: \`--ignored-channels="#general #announcements"\`${
                        channels.length
                            ? '. If you want to proceed to unlock only all the channels that you have permission to lock, press the "Continue anyway" button'
                            : ''
                    }`
                );

            const continueAnyway = new MessageButton()
                .setLabel('Continue anyway')
                .setStyle('SUCCESS')
                .setCustomId('unlockserver:continue');
            const cancel = new MessageButton().setLabel('Cancel').setStyle('DANGER').setCustomId('unlockserver:cancel');
            const row = new MessageActionRow().addComponents(continueAnyway, cancel);

            const msg = await message.reply({ embeds: [failEmbed], components: channels.length ? [row] : [] });
            const collector = msg.createMessageComponentCollector({ time: 62000 });

            continueAnyway.setDisabled(true), cancel.setDisabled(true);
            const newRow = new MessageActionRow().addComponents(continueAnyway, cancel);

            collector.on('collect', async interaction => {
                if (interaction.user.id !== message.author.id)
                    return void client.util.throwError(interaction, 'You cannot use this button.');
                await interaction.update({ components: [newRow] });

                if (interaction.customId === 'unlockserver:cancel') return collector.stop();
                else if (interaction.customId === 'unlockserver:continue') {
                    const forged = message;
                    forged.content = `${client.cache.settings.get(message.guild.id).prefix}unlockserver ${
                        informedChannel ?? ''
                    } ${reason || ''} ${
                        informUnlockedChannels ? '--inform-unlocked-channels' : ''
                    } --ignored-channels="${ignoredChannels
                        .concat(failedChannels.map(fail => fail.channel.id))
                        .join(' ')}"`;

                    collector.stop();
                    return void this.execute(client, forged, forged.content.split(' ').slice(1));
                }
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time' && channels.length) msg.edit({ components: [newRow] });
            });

            return;
        }

        if (!channels.length) return client.util.throwError(message, 'I could not find any channels to unlock.');

        const stopBtn = new MessageButton().setLabel('Stop').setStyle('DANGER').setCustomId('unlockserver:stop');
        const row = new MessageActionRow().addComponents(stopBtn);

        let uneditable = false;
        let unlockMsg = await message.reply({
            content: `Unlocking server... **[1/${channels.length}]** • ${channels[0].toString()}`,
            components: [row]
        });
        let failed = 0;
        let halt = false;

        const collector = unlockMsg.createMessageComponentCollector({ time: 60000 });
        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id)
                return void client.util.throwError(interaction, 'You cannot use this button.');
            if (interaction.customId === 'unlockserver:stop') {
                halt = true;
                return collector.stop();
            }
        });

        for (let i = 0; i < channels.length; ++i) {
            if (halt) return unlockMsg?.edit({ content: 'Server unlock forcefully stopped.', components: [] });
            const channel = channels[i];
            const channelLockData = guildLocked.channels.find(c => c.id === channel.id);

            const updatedOverwrites = channelLockData.allowedOverwrites
                .filter(__overwrite => {
                    const overwrite = channel.permissionOverwrites.cache.get(__overwrite);
                    if (!overwrite) return false;
                    return overwrite.id === message.guild.id
                        ? channelLockData.everyoneRoleType === 'allowed'
                            ? overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES)
                            : channelLockData.everyoneRoleType === 'denied' &&
                              overwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                        : overwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES);
                })
                .map(overwrite => {
                    const overwriteData = channel.permissionOverwrites.cache.get(overwrite);
                    return {
                        id: overwrite,
                        type: 'role',
                        allow: !overwriteData.allow.has(Permissions.FLAGS.SEND_MESSAGES)
                            ? overwriteData.allow.bitfield + Permissions.FLAGS.SEND_MESSAGES
                            : overwriteData.allow.bitfield,
                        deny: overwriteData.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                            ? overwriteData.deny.bitfield - Permissions.FLAGS.SEND_MESSAGES
                            : overwriteData.deny.bitfield
                    };
                });

            if (channelLockData.everyoneRoleType !== 'denied') {
                const everyoneOverwrite = channel.permissionOverwrites.cache.get(message.guild.id);
                if (everyoneOverwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES)) {
                    updatedOverwrites.push({
                        id: everyoneOverwrite.id,
                        type: 'role',
                        allow:
                            everyoneOverwrite.allow.bitfield +
                            (channelLockData.everyoneRoleType === 'allowed' ? Permissions.FLAGS.SEND_MESSAGES : 0n),
                        deny: everyoneOverwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                            ? everyoneOverwrite.deny.bitfield - Permissions.FLAGS.SEND_MESSAGES
                            : everyoneOverwrite.deny.bitfield
                    });
                }
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
                await channel.permissionOverwrites.set(newOverwrites, reason);
            } catch {
                channels.splice(i, 1);
                i--;
                ++failed;
                if (failed == 3) {
                    if (!uneditable)
                        await unlockMsg
                            ?.edit({
                                content:
                                    'The server unlock was halted due to the error threshold of **3** being reached. Did my permissions change during the lock?',
                                components: []
                            })
                            .catch(() => {});
                    else
                        await message.channel
                            ?.send(
                                'The server unlock was halted due to the error threshold of **3** being reached. Did my permissions change during the lock?'
                            )
                            .catch(() => {});

                    collector.stop();
                    return;
                }

                continue;
            }

            await lockSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    channels: guildLocked.channels.filter(ch => ch.id !== channel.id)
                }
            );

            if (informUnlockedChannels?.value === true)
                await channel.send('This channel has been unlocked from a server unlock');

            if (i == 0) continue;

            if (!uneditable)
                await unlockMsg
                    ?.edit(`Unlocking server... **[${i + 1}/${channels.length}]** • ${channels[i]?.toString()}`)
                    .catch(() => (uneditable = true));
            else if (i % 5 == 0) {
                uneditable = false;
                unlockMsg = await message.channel
                    .send({
                        content: `Unlocking server... **[${i + 1}/${channels.length}]** • ${channels[i]?.toString()}`,
                        components: [row]
                    })
                    .catch(() => ((uneditable = true), (unlockMsg = undefined)));
            }

            await this.sleep(1000);
        }

        if (!uneditable)
            await unlockMsg
                ?.edit({
                    content: `Server unlock completed, unlocked **${channels.length}** channel${
                        channels.length == 1 ? '' : 's'
                    }${failed > 0 ? `, but failed to lock **${failed}** channel${failed == 1 ? '' : 's'}` : ''}`,
                    components: []
                })
                .catch(() => {});
        else
            message.channel
                .send(
                    `Server lock completed, unlocked **${channels.length}** channel${channels.length == 1 ? '' : 's'}${
                        failed > 0 ? `, but failed to unlock **${failed}** channel${failed == 1 ? '' : 's'}` : ''
                    }.`
                )
                .catch(() => {});

        if (informedChannel) {
            const lockedServerEmbed = new MessageEmbed()
                .setColor(client.config.colors.punishment[1])
                .setAuthor('Server Unlocked', client.user.displayAvatarURL())
                .setTitle('This server has been unlocked');
            if (reason) lockedServerEmbed.setDescription(await client.util.contentOrBin(reason));

            await informedChannel.send({ embeds: [lockedServerEmbed] });
        }

        // so, I feel like this might need explanation, as it may lead to confusiong
        // why do this if I remove each one in the for loop? Or why not just do this at the end and not remove them in the for loop?
        // The main reasoning is: halting. If something interupts Paralle in the middle and it isn't able to finish, that's a bunch of locked channels that have no unlock data
        // That would be quite frustrating to undo for the server administration
        await lockSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                channels: guildLocked.channels.filter(ch => ignoredChannels.includes(ch.id))
            }
        );

        collector.stop();
    },
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
