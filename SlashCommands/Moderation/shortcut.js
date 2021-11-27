const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const settingsSchema = require('../../schemas/settings-schema');
const punishmentSchema = require('../../schemas/punishment-schema');
const Infraction = require('../../structures/Infraction');
const Punishment = require('../../structures/Punishment');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const ModerationLogger = require('../../structures/ModerationLogger');

module.exports = {
    name: 'shortcut',
    description: 'Access a server shortcut using this command',
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    data: new SlashCommandBuilder()
        .setName('shortcut')
        .setDescription('Access a server shortcut using this command')
        .addStringOption(option => option.setName('name').setDescription('The shortcut name').setRequired(true))
        .addUserOption(option => option.setName('target').setDescription('The shortcut target').setRequired(true)),
    async execute(client, interaction, args) {
        const denyAccess = commandName => {
            const errorMessage = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setAuthor('Access Denied')
                .setDescription(`You do not have permission to use the shortcut member \`${commandName}\` `);
            return interaction.reply({ embeds: [errorMessage], ephemeral: true });
        };

        const settings = await settingsSchema.findOne({ guildID: interaction.guild.id });
        const { shortcutCommands, modRoles, muterole, removerolesonmute, delModCmds } = settings;

        const isModerator = interaction.member.roles.cache.some(role => modRoles.includes(role));

        const shortcmd = shortcutCommands.find(command => command.name === args['name']);
        if (!shortcmd) return client.util.throwError(interaction, 'No shortcut with the provided name exists');

        let member;
        let permissions;

        if (shortcmd.type === 'warn') permissions = Discord.Permissions.FLAGS.MANAGE_MESSAGES;
        else if (shortcmd.type === 'kick') permissions = Discord.Permissions.FLAGS.KICK_MEMBERS;
        else if (shortcmd.type === 'mute' || shortcmd.type === 'tempmute')
            permissions = Discord.Permissions.FLAGS.MANAGE_ROLES;
        else if (shortcmd.type === 'ban' || shortcmd.type === 'tempban')
            permissions = Discord.Permissions.FLAGS.BAN_MEMBERS;

        const punishmentID = client.util.generateID();
        const duration = shortcmd.duration !== 'Permanent' ? shortcmd.duration : null;

        if (!interaction.member.permissions.has(permissions) && !isModerator) return denyAccess(shortcmd.name);
        if (!interaction.guild.me.permissions.has(permissions) && permissions !== 'warn')
            return missingPerms(permissions.replace(pemissions.toUpperCase().replace('_', ' ').replace('_', ' ')));

        if (
            shortcmd.type === 'mute' ||
            shortcmd.type === 'tempmute' ||
            shortcmd.type === 'ban' ||
            shortcmd.type === 'tempban'
        ) {
            member =
                (await client.util.getMember(interaction.guild, args['target'])) ||
                (await client.util.getUser(client, args['target']));
            if (!member) return client.util.throwError(interaction, client.config.errors.missing_argument_user);
            if (member.user) {
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
                if (member === interaction.guild.owner)
                    return client.util.throwError(interaction, client.config.errors.cannot_punish_owner);
            }
            if (shortcmd.type === 'ban' || shortcmd.type === 'tempban') {
                const alreadyBanned = await interaction.guild.bans
                    .fetch()
                    .then(bans => bans.find(ban => ban.user.id === member.id));
                if (alreadyBanned) return client.util.throwError(interaction, 'This user is already banned');
                const { baninfo } = settings;
                if (member.user)
                    await new DMUserInfraction(
                        client,
                        'banned',
                        client.config.colors.punishment[2],
                        interaction,
                        member,
                        {
                            reason: shortcmd.reason,
                            punishmentID: punishmentID,
                            time: duration,
                            baninfo: baninfo !== 'none' ? baninfo : null
                        }
                    );
                new ModerationLogger(client, 'Banned', interaction.member, member, interaction.channel, {
                    reason: shortcmd.reason,
                    duration: shortcmd.duration,
                    punishmentID: punishmentID
                });
                await interaction.guild.members.ban(member.id, { reason: shortcmd.reason });
                new Infraction(client, 'Ban', interaction, interaction.member, member, {
                    reason: shortcmd.reason,
                    punishmentID: punishmentID,
                    time: duration,
                    auto: false
                });
                if (shortcmd.type === 'tempban')
                    new Punishment(interaction.guild.name, interaction.guild.id, 'ban', member.id, {
                        reason: shortcmd.reason,
                        time: duration ? Date.now() + duration : 'Never'
                    });
            } else if (shortcmd.type === 'mute' || shortcmd.type === 'tempmute') {
                const hasMuteRecord = await punishmentSchema.findOne({
                    guildID: interaction.guild.id,
                    userID: member.id,
                    type: 'mute'
                });
                if (member?.permissions?.has(Discord.Permissions.FLAGS.MANAGE_ROLES) && !removerolesonmute)
                    return client.util.throwError(
                        interaction,
                        'This command may not be effective on this member | If you have the **Remove Roles On Mute** module enabled, this may work'
                    );

                const role =
                    interaction.guild.roles.cache.get(muterole) || (await client.util.createMuteRole(interaction));
                if (role.position >= interaction.guild.me.roles.highest.position)
                    return client.util.throwError(interaction, 'My hierarchy is too low to manage the muted role');
                if (member?.roles?.cache?.has(role.id))
                    return client.util.throwError(interaction, 'This user already currently muted');
                else if (hasMuteRecord) {
                    await punishmentSchema.deleteMany({
                        guildID: interaction.guild.id,
                        userID: member.id,
                        type: 'mute'
                    });
                }

                if (member.user) {
                    const unmanagableRoles = removerolesonmute
                        ? member.roles.cache.filter(roles => roles.managed).map(roles => roles.id)
                        : [];
                    if (removerolesonmute) await member.roles.set([role, ...unmanagableRoles]);
                    else await client.util.muteMember(interaction, member, role);

                    new DMUserInfraction(client, 'muted', client.config.colors.punishment[1], interaction, member, {
                        reason: shortcmd.reason,
                        punishmentID: punishmentID,
                        time: duration
                    });

                }

                const memberRoles = removerolesonmute ? member?.roles?.cache?.map(roles => roles.id) : [];

                new Infraction(client, 'Mute', interaction, interaction.member, member, {
                    reason: shortcmd.reason,
                    punishmentID: punishmentID,
                    time: duration,
                    auto: false
                });
                new Punishment(interaction.guild.name, interaction.guild.id, 'mute', member.id, {
                    reason: shortcmd.reason,
                    time: duration ? Date.now() + duration : 'Never',
                    roles: memberRoles
                });
                new ModerationLogger(client, 'Muted', interaction.member, member, interaction.channel, {
                    reason: shortcmd.reason,
                    duration: duration,
                    punishmentID: punishmentID
                });
            }
        } else {
            member = await client.util.getMember(interaction.guild, args['target']);
            if (!member) return client.util.throwError(interaction, client.config.errors.missing_argument_member);
            if (member.id === client.user.id)
                return client.util.throwError(interaction, client.config.errors.cannot_punish_myself);
            if (member.id === interaction.member.id)
                return client.util.throwError(interaction, client.config.errors.cannot_punish_yourself);
            if (
                member.roles.highest.position >= interaction.member.roles.highest.position &&
                interaction.member.id !== interaction.guild.ownerId
            )
                return client.util.throwError(interaction, client.config.errors.hierarchy);
            if (shortcmd.type === 'kick')
                if (member.roles.highest.position >= interaction.guild.me.roles.highest.position)
                    return client.util.throwError(interaction, client.config.errors.my_hierarchy);
            if (member === interaction.guild.owner)
                return client.util.throwError(interaction, client.config.errors.cannot_punish_owner);
            if (shortcmd.type === 'kick') {
                new DMUserInfraction(client, 'kicked', client.config.colors.punishment[1], interaction, member, {
                    reason: shortcmd.reason,
                    punishmentID: punishmentID,
                    time: 'ignore'
                });
                await interaction.guild.members.kick(member, { reason: shortcmd.reason });
                new Infraction(client, 'Kick', interaction, interaction.member, member, {
                    reason: shortcmd.reason,
                    punishmentID: punishmentID,
                    time: null,
                    auto: false
                });
                new ModerationLogger(client, 'Kicked', interaction.member, member, interaction.channel, {
                    reason: shortcmd.reason,
                    duration: null,
                    punishmentID: punishmentID
                });
            } else if (shortcmd.type === 'warn') {
                new Infraction(client, 'Warn', interaction, interaction.member, member, {
                    reason: shortcmd.reason,
                    punishmentID: punishmentID,
                    time: shortcmd.duration,
                    auto: false
                });
                new DMUserInfraction(client, 'warned', client.config.colors.punishment[1], interaction, member, {
                    reason: shortcmd.reason,
                    punishmentID: punishmentID,
                    time: shortcmd.duration
                });
                new ModerationLogger(client, 'Warned', interaction.member, member, interaction.channel, {
                    reason: shortcmd.reason,
                    duration: shortcmd.duration,
                    punishmentID: punishmentID
                });
            }
        }

        const punishedEmbed = new Discord.MessageEmbed();
        if (shortcmd.type === 'warn') punishedEmbed.setColor(client.config.colors.punishment[0]);
        if (shortcmd.type === 'kick') punishedEmbed.setColor(client.config.colors.punishment[1]);
        if (shortcmd.type === 'mute' || shortcmd.type === 'tempmute')
            punishedEmbed.setColor(client.config.colors.punishment[1]);
        if (shortcmd.type === 'ban' || shortcmd.type === 'tempban')
            punishedEmbed.setColor(client.config.colors.punishment[2]);
        const stype = shortcmd.type.replace('temp', '');
        punishedEmbed.setDescription(
            `✅ **${member.user ? member.toString() : member.tag}** has been ${(
                stype.charAt(0).toUpperCase() +
                stype.slice(1) +
                (stype.endsWith('e') ? '' : stype.endsWith('ban') ? 'ne' : 'e')
            ).toLowerCase()}d with ID \`${punishmentID}\``
        );

        if (delModCmds) {
            interaction.reply({
                content: `Successfully ${(
                    stype.charAt(0).toUpperCase() +
                    stype.slice(1) +
                    (stype.endsWith('e') ? '' : stype.endsWith('ban') ? 'ne' : 'e')
                ).toLowerCase()}d ${member.user ? member.toString() : member.tag}`,
                ephemeral: true
            });
            return interaction.channel.send({ embeds: [punishedEmbed] });
        } else return interaction.reply({ embeds: [punishedEmbed] });
    }
};
