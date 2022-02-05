const Discord = require('discord.js');
const lockSchema = require('../../schemas/lock-schema');
const { SlashCommandBuilder, ChannelType } = require('@discordjs/builders');
const { MessageEmbed, Permissions } = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');

module.exports = {
    name: 'unlock',
    description: 'Grants the permission for members to speak in the specified channel',
    requiredBotPermissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Grants the permission for members to speak in the specified channel')
        .addChannelOption(option => option.setName('channel').setDescription('The channel to unlock'))
        .addStringOption(option =>
            option.setName('reason').setDescription('The shown reason for unlocking the channel')
        ),
    async execute(client, interaction, args) {
        let channel = client.util.getChannel(interaction.guild, args.channel);
        if (channel) {
            if (!channel.isText()) return client.util.throwError(interaction, 'the channel must be a text channel');
            if (channel.isThread())
                return client.util.throwError(interaction, 'the channel must be a non-thread text channel channel');
        }

        channel ??= interaction.channel;

        const guildSettings = await settingsSchema.findOne({ guildID: interaction.guild.id });
        const { modRoles } = guildSettings;

        if (
            !channel
                .permissionsFor(interaction.guild.me)
                .has([Permissions.FLAGS.MANAGE_CHANNELS, Permissions.FLAGS.MANAGE_ROLES])
        )
            return interaction.reply(
                `I do not have permission to manage permissions in ${channel !== interaction.channel ? 'that' : 'this'
                } channel.`,
                true
            );

        if (
            !channel
                .permissionsFor(interaction.member)
                .has([Permissions.FLAGS.MANAGE_CHANNELS, Permissions.FLAGS.MANAGE_ROLES]) &&
            !interaction.member.roles.cache.some(role => modRoles.includes(role.id))
        )
            return client.util.throwError(
                interaction,
                `You do not have permission to manage permissions in ${channel !== interaction.channel ? 'that' : 'this'
                } channel.`
            );

        const guildLockData = (await lockSchema.findOne({ guildID: interaction.guild.id }));
        const channelLockData = guildLockData.channels.find(ch => ch.id === channel.id);;
        if (!channelLockData) return client.util.throwError(interaction, 'this channel is not recognized as locked.');

        const updatedOverwrites = channelLockData.allowedOverwrites
            .filter(__overwrite => {
                const overwrite = channel.permissionOverwrites.cache.get(__overwrite);
                if (!overwrite) return false;
                return overwrite.id === interaction.guild.id
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
            const everyoneOverwrite = channel.permissionOverwrites.cache.get(interaction.guild.id);
            if (everyoneOverwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES)) {
                updatedOverwrites.push({
                    id: everyoneOverwrite.id,
                    type: 'role',
                    allow: everyoneOverwrite.allow.bitfield + (channelLockData.everyoneRoleType === 'allowed' ? Permissions.FLAGS.SEND_MESSAGES : 0n),
                    deny: everyoneOverwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                        ? everyoneOverwrite.deny.bitfield - Permissions.FLAGS.SEND_MESSAGES
                        : everyoneOverwrite.deny.bitfield
                });
            }
        }

        if (!updatedOverwrites.length) {
            await lockSchema.updateOne({
                guildID: interaction.guild.id
            },
                {
                    channels: guildLockData.channels.filter(ch => ch.id !== channel.id)
                }
            );

            return client.util.throwError(
                interaction,
                'I do not have enough information to unlock this channel. Some things are not the way they were when I locked this channel. This channel has been unmarked as locked.'
            );
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

        if (
            !interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
            !channel.permissionOverwrites.cache.some(overwrite => {
                if (
                    interaction.member.roles.cache.some(
                        role =>
                            overwrite.id === role.id &&
                            overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES) &&
                            !updatedOverwrites.some(o => o.id === overwrite.id)
                    )
                )
                    return true;

                return overwrite.id === interaction.member.id && overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES);
            })
        )
            return client.util.throwError(
                interaction,
                'You cannot lock this channel. If you believe this is an error — which you likely do — have an administrator set a new override in this channel for a moderator role you have and grant it the Send Mesasges permission.'
            );

        if (
            !interaction.guild.me.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
            !channel.permissionOverwrites.cache.some(overwrite => {
                if (
                    interaction.guild.me.roles.cache.some(
                        role =>
                            overwrite.id === role.id &&
                            overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES) &&
                            !updatedOverwrites.some(o => o.id === overwrite.id)
                    )
                )
                    return true;

                return overwrite.id === interaction.guild.me.id && overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES);
            })
        )
            return client.util.throwError(
                interaction,
                'I am unable to lock this channel. There are two possible solutions to resolve this issue; set a new override in this channel for me and grant it the Send Mesasges permission, or give me the Administrator permission.'
            );

        const reason = args.reason;

        await channel.permissionOverwrites.set(newOverwrites, reason);

        await lockSchema.updateOne({
            guildID: interaction.guild.id
        },
            {
                channels: guildLockData.channels.filter(ch => ch.id !== channel.id)
            }
        );

        const unlockedEmbed = new MessageEmbed()
            .setColor(client.config.colors.punishment[1])
            .setAuthor('Channel Unlock', client.user.displayAvatarURL())
            .setTitle('This channel has been unlocked');
        if (reason) unlockedEmbed.setDescription(reason);

        await channel.send({ embeds: [unlockedEmbed] });

        if (channel !== interaction.channel) return interaction.reply(`${channel} has been unlocked.`);
        else return interaction.reply({ content: 'This channel has been unlocked.', ephemeral: true });
    }
};
