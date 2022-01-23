const Discord = require('discord.js');
const lockSchema = require('../../schemas/lock-schema');
const settingsSchema = require('../../schemas/settings-schema');
const { MessageEmbed, Permissions } = require('discord.js');

module.exports = {
    name: 'lock',
    description: 'Denies the permission for members to speak in the specified channel',
    usage: 'lock <channel>',
    requiredBotPermissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    async execute(client, message, args) {
        let channel = client.util.getChannel(message.guild, args[0]);
        if (channel) {
            if (!channel.isText()) return client.util.throwError(message, 'the channel must be a text channel');
            if (channel.isThread())
                return client.util.throwError(message, 'the target channel cannot be a thread channel');

            args.splice(0, 1);
        }

        channel ??= message.channel;

        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
        const { modRoles } = guildSettings;

        if (
            !channel
                .permissionsFor(message.guild.me)
                .has([Permissions.FLAGS.MANAGE_CHANNELS, Permissions.FLAGS.MANAGE_ROLES])
        )
            return message.reply(
                `I do not have permission to manage permissions in ${channel !== message.channel ? 'that' : 'this'
                } channel.`,
                true
            );

        if (
            !channel
                .permissionsFor(message.member)
                .has([Permissions.FLAGS.MANAGE_CHANNELS, Permissions.FLAGS.MANAGE_ROLES]) &&
            !message.member.roles.cache.some(role => modRoles.includes(role.id))
        )
            return client.util.throwError(
                message,
                `You do not have permission to lock ${channel !== message.channel ? 'that' : 'this'
                } channel.`
            );

        const targetOverwrites = channel.permissionOverwrites.cache.filter(overwrite => {
            const role = message.guild.roles.cache.get(overwrite.id);
            if (!role) return false;
            return overwrite.id === message.guild.id
                ? !overwrite.deny.has(Permissions.FLAGS.SEND_MESSAGES)
                : !role.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES) &&
                !modRoles.includes(role.id) && 
                overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES)
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

        if (
            !updatedOverwrites.length ||
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
            return client.util.throwError(
                message,
                "this channel doesn't have any overrides to update; already in a locked state."
            );

        if (
            !message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
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

                return overwrite.id === message.member.id && overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES);
            })
        )
            return client.util.throwError(
                message,
                'You cannot lock this channel. If you believe this is an error — which you likely do — have an administrator set a new override in this channel for a moderator role you have and grant it the Send Mesasges permission.'
            );

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

                return overwrite.id === message.guild.me.id && overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES);
            })
        )
            return message.reply(
                'I am unable to lock this channel. There are two possible solutions to resolve this issue; set a new override in this channel for me and grant it the Send Mesasges permission, or give me the Administrator permission.'
            );

        const reason = args.join(' ');

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

        await channel.permissionOverwrites.set(
            newOverwrites,
            `Locked by ${message.author.tag} ${reason ? `| ${await client.util.contentOrBin(reason)}` : ''}`
        );

        const lockInformation = await lockSchema.findOne({ guildID: message.guild.id });
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

        if (isLocked) {
            const newLocked = [
                ...lockInformation.channels.filter(ch => ch.id !== channel.id),
                data
            ];
            await lockSchema.updateOne({ guildID: message.guild.id }, { channels: newLocked });
        } else await lockSchema.updateOne({ guildID: message.guild.id }, { $push: { channels: data } } );

        const lockedEmbed = new MessageEmbed()
            .setColor(client.config.colors.punishment[1])
            .setAuthor('Channel Lock', client.user.displayAvatarURL())
            .setTitle('This channel has been locked');
        if (reason) lockedEmbed.setDescription(await client.util.contentOrBin(reason));

        await channel.send({ embeds: [lockedEmbed] });

        if (channel !== message.channel) return message.reply(`${channel} has been locked.`);
    }
};
