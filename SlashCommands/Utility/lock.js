const Discord = require('discord.js');
const lockSchema = require('../../schemas/lock-schema');
const settingsSchema = require('../../schemas/settings-schema');
const { MessageEmbed, Permissions } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'lock',
    description: 'Denies the permission for members to speak in the specified channel',
    requiredBotPermissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Denies the permission for members to speak in the specified channel')
        .addChannelOption(option => option.setName('channel').setDescription('The channel to lock'))
        .addStringOption(option => option.setName('reason').setDescription('The shown reason for locking the channel')),
    async execute(client, interaction, args) {
        let channel = client.util.getChannel(interaction.guild, args.channel);
        if (channel) {
            if (!channel.isText()) return client.util.throwError(interaction, 'the channel must be a text channel');
            if (channel.isThread())
                return client.util.throwError(interaction, 'the target channel cannot be a thread channel');
        }

        channel ??= interaction.channel;

        const guildSettings = await settingsSchema.findOne({ guildID: interaction.guild.id });
        const { modRoles } = guildSettings;

        if (
            !channel
                .permissionsFor(interaction.guild.me)
                .has([Permissions.FLAGS.MANAGE_CHANNELS, Permissions.FLAGS.MANAGE_ROLES])
        )
            return client.util.throwError(
                interaction,
                `I do not have permission to manage permissions in ${
                    channel !== interaction.channel ? 'that' : 'this'
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
                `You do not have permission to lock ${channel !== interaction.channel ? 'that' : 'this'} channel.`
            );

        const targetOverwrites = channel.permissionOverwrites.cache.filter(overwrite => {
            const role = interaction.guild.roles.cache.get(overwrite.id);
            if (!role) return false;
            return overwrite.id === interaction.guild.id
                ? !overwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                : !role.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES) &&
                      !modRoles.includes(role.id) &&
                      overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES);
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

        if (
            !updatedOverwrites.length ||
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
            return client.util.throwError(
                interaction,
                "this channel doesn't have any overrides to update; already in a locked state."
            );

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

        const everyoneRoleType = channel.permissionOverwrites.cache.get(interaction.guildId).allow.has(Permissions.FLAGS.SEND_MESSAGES)
            ? 'allowed'
            :  channel.permissionOverwrites.cache.get(interaction.guildId).deny.has(Permissions.FLAGS.SEND_MESSAGES)
            ? 'denied'
            : 'neutral';

        await channel.permissionOverwrites.set(
            newOverwrites,
            `Locked by ${interaction.user.tag} ${reason ? `| ${await client.util.contentOrBin(reason)}` : ''}`
        );

        const lockInformation = await lockSchema.findOne({ guildID: interaction.guild.id });
        const isLocked = lockInformation?.channels.some(ch => ch.id === channel.id);

        const allowedOverwrites = targetOverwrites
            .filter(overwrite => overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES))
            .map(overwrite => overwrite.id);

        const data = {
            id: channel.id,
            allowedOverwrites,
            everyoneRoleType: everyoneRoleType
        };

        if (isLocked) {
            const newLocked = [...lockInformation.channels.filter(ch => ch.id !== channel.id), data];
            await lockSchema.updateOne({ guildID: interaction.guild.id }, { channels: newLocked });
        } else await lockSchema.updateOne({ guildID: interaction.guild.id }, { $push: { channels: data } });

        const lockedEmbed = new MessageEmbed()
            .setColor(client.config.colors.punishment[1])
            .setAuthor('Channel Lock', client.user.displayAvatarURL())
            .setTitle('This channel has been locked');
        if (reason) lockedEmbed.setDescription(await client.util.contentOrBin(reason));

        await channel.send({ embeds: [lockedEmbed] });

        if (channel !== interaction.channel) return interaction.reply(`${channel} has been locked.`);
        else return interaction.reply({ content: `This channel has been locked.`, ephemeral: true });
    }
};
