const settingsSchema = require('../schemas/settings-schema');
const automodSchema = require('../schemas/automod-schema');
const punishmentSchema = require('../schemas/punishment-schema');
const warningSchema = require('../schemas/warning-schema');
const lockSchema = require('../schemas/lock-schema');
const systemSchema = require('../schemas/system-schema');
const tagSchema = require('../schemas/tag-schema');
const afkSchema = require('../schemas/afk-schema');

const AFKTriggerCooldown = new Set();

const ModerationLogger = require('../structures/ModerationLogger');
const DMUserInfraction = require('../structures/DMUserInfraction');
const Infraction = require('../structures/Infraction');
const Punishment = require('../structures/Punishment');
const AutomodChecks = require('../structures/AutomodChecks');

const Discord = require('discord.js');
const notMutedCache = require('../structures/Punishment').cache;

module.exports = {
    name: 'messageCreate',
    async execute(client, message) {
        if (global.void === true && !client.config.developers.includes(message.author.id)) return;

        if (
            message.author.bot ||
            !message.guild ||
            !message.channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.SEND_MESSAGES)
        )
            return;

        const settings =
            client.cache.settings.get(message.guild.id) ||
            (await settingsSchema
                .findOne({
                    guildID: message.guild.id
                })
                .catch(() => {})) ||
            (await new settingsSchema({
                guildname: message.guild.name,
                guildID: message.guild.id,
                prefix: client.config.prefix,
                baninfo: 'none',
                delModCmds: false,
                locked: [],
                autowarnexpire: 'disabled',
                manualwarnexpire: 'disabled',
                messageLogging: 'none',
                messageLoggingIgnored: [],
                moderationLogging: 'none',
                automodLogging: 'none',
                modRoles: [],
                modRolePermissions: '402661398',
                shortCommands: [],
                muterole: 'none',
                removerolesonmute: false,
                errorConfig: {
                    missingPermission: 'respond',
                    disabledCommandChannel: 'respond',
                    deleteDelay: '5000'
                }
            }).save());

        if (!client.cache.settings.has(message.guild.id)) client.cache.settings.set(message.guild.id, settings);

        let prefix = global.perpendicular ? '=' : settings.prefix || client.config.prefix;
        if (new RegExp(`^<@!?${client.user.id}>`).exec(message.content)?.index === 0)
            prefix = message.content.split(' ')[0] + ' ';
        const { muterole, removerolesonmute, modRoles, modRolePermissions, errorConfig, locked } = settings;

        const findMuteRole =
            message.guild.roles.cache.find(r => r.name.toLowerCase() === 'mute') ||
            (await message.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted')) ||
            'none';

        if (muterole === 'none') {
            await settingsSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    muterole: findMuteRole.id
                }
            );

            client.cache.settings.delete(message.guild.id);
        }

        if (!message.guild.roles.cache.get(muterole) && muterole !== 'none') {
            await settingsSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    muterole: 'none'
                }
            );

            client.cache.settings.delete(message.guild.id);
        }

        if (!global.notMutedUsers.includes(message.author.id)) {
            const punishmentCheck = await punishmentSchema.findOne({
                userID: message.member.id,
                guildID: message.guild.id,
                type: 'mute'
            });

            if (!punishmentCheck) global.notMutedUsers.push(message.author.id);

            if (punishmentCheck && !message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) {
                const { reason, expires, date } = punishmentCheck;
                const role = message.guild.roles.cache.get(muterole) || (await client.util.createMuteRole(message));
                if (!message.member.roles.cache.has(role.id)) {
                    if (
                        [...message.channel.permissionOverwrites?.cache?.values()]?.some(
                            overwrite => message.guild.roles.cache.get(overwrite.id)?.id === muterole
                        )
                    )
                        message.delete();
                    if (Date.now() - message.member.joinedAt < 2000) return;

                    const _unmanagableRoles = message.member.roles.cache
                        .filter(role => role.managed)
                        .map(roles => roles.id);
                    if (removerolesonmute && message.guild.roles.cache.get(muterole))
                        await message.member.roles.set([muterole, ..._unmanagableRoles]);
                    else await client.util.muteMember(message, message.member, role);

                    const mutedEmbed = new Discord.MessageEmbed()
                        .setColor(client.config.colors.punishment[1])
                        .setAuthor(`Parallel Moderation`, client.user.displayAvatarURL())
                        .setTitle(`You are currently muted in ${message.member.guild.name}!`)
                        .addField('Reason', reason)
                        .addField(
                            'Duration',
                            expires !== 'Never' ? client.util.duration(expires - Date.now()) : 'Permanent',
                            true
                        )
                        .addField(
                            'Expires',
                            expires !== 'Never' ? client.util.timestamp(Date.now() + (expires - Date.now())) : 'Never',
                            true
                        )
                        .addField('Date', date);
                    await message.member.send({ embeds: [mutedEmbed] }).catch(() => {});

                    return;
                }
            }
        }

        if (!client.cache.hasAllSchemas.includes(message.guild.id)) {
            const automodCheck = await automodSchema.findOne({
                guildID: message.guild.id
            });

            if (!automodCheck) {
                await new automodSchema({
                    guildname: message.guild.name,
                    guildID: message.guild.id,
                    filter: 'disabled',
                    filterList: [],
                    fast: 'disabled',
                    walltext: 'disabled',
                    links: 'disabled',
                    maliciouslinks: 'disabled',
                    allowTenor: {
                        enabled: false,
                        attachmentPermsOnly: false
                    },
                    invites: 'disabled',
                    massmention: 'disabled',
                    filterTempMuteDuration: 0,
                    fastTempMuteDuration: 0,
                    walltextTempMuteDuration: 0,
                    linksTempMuteDuration: 0,
                    invitesTempMuteDuration: 0,
                    massmentionTempMuteDuration: 0,
                    filterTempBanDuration: 0,
                    fastTempBanDuration: 0,
                    walltextTempBanDuration: 0,
                    linksTempBanDuration: 0,
                    invitesTempBanDuration: 0,
                    massmentionTempBanDuration: 0,
                    maliciouslinksTempMuteDuration: 0,
                    maliciouslinksTempBanDuration: 0,
                    bypassChannels: [],
                    bypassRoles: []
                }).save();
            }

            const warningsCheck = await warningSchema.findOne({ guildID: message.guild.id });
            if (!warningsCheck) {
                await new warningSchema({
                    guildname: message.guild.name,
                    guildID: message.guild.id,
                    warnings: []
                }).save();
            }

            const systemCheck = await systemSchema.findOne({ guildID: message.guild.id });
            if (!systemCheck) {
                await new systemSchema({
                    guildname: message.guild.name,
                    guildID: message.guild.id,
                    system: []
                }).save();
            }

            const lockCheck = await lockSchema.findOne({ guildID: message.guild.id });
            if (!lockCheck) {
                await new lockSchema({
                    guildname: message.guild.name,
                    guildID: message.guild.id,
                    channels: []
                }).save();
            }

            const tagCheck = await tagSchema.findOne({ guildID: message.guild.id });
            if (!tagCheck) {
                await new tagSchema({
                    guildname: message.guild.name,
                    guildID: message.guild.id,
                    allowedRoleList: [],
                    allowedChannelList: [],
                    tags: []
                }).save();
            }

            const afkCheck = await afkSchema.findOne({ guildID: message.guild.id });
            if (!afkCheck) {
                await new afkSchema({
                    guildname: message.guild.name,
                    guildID: message.guild.id,
                    afks: []
                }).save();
            }

            client.cache.hasAllSchemas.push(message.guild.id);
        }

        const isModerator = modRoles.some(role => message.member.roles.cache.has(role));

        const automodSettings =
            client.cache.automod.get(message.guild.id) || (await automodSchema.findOne({ guildID: message.guild.id }));
        if (!client.cache.automod.has(message.guild.id)) client.cache.automod.set(message.guild.id, automodSettings);
        const { bypassChannels, bypassRoles } = automodSettings;

        const channelBypassed =
            bypassChannels.includes(message.channel.id) || bypassChannels.includes(message.channel.parentId);
        const roleBypassed = [...message.member.roles.cache.values()].some(role => bypassRoles.includes(role.id));

        if (
            !message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
            !isModerator &&
            !channelBypassed &&
            !roleBypassed
        )
            new AutomodChecks(client, message);

        if (
            new RegExp(`^<@!?${client.user.id}>`).test(message.content) &&
            client.helpers.cooldown.check(message.author.id).inCooldown === false &&
            message.content.split(' ').length === 1
        ) {
            client.helpers.cooldown.add(message.author.id);

            return message.reply(
                `My prefix is \`${settings.prefix}\` | Run \`${settings.prefix}help\` for a list of commands`
            );
        }

        if (!message.content.startsWith(prefix)) {
            if (AFKTriggerCooldown.has(message.author.id)) return;
            else {
                AFKTriggerCooldown.add(message.author.id);
                setTimeout(() => AFKTriggerCooldown.delete(message.author.id), 5000);
            }

            const afks = await afkSchema.findOne({ guildID: message.guild.id }).then(result => result.afks);
            if (message.mentions.users.some(mention => afks.some(afk => afk.userID === mention.id))) {
                const mentionedAFKUsers = message.mentions.users.filter(mention =>
                    afks.some(afk => afk.userID === mention.id)
                );

                let list = [...mentionedAFKUsers.values()];
                if (list.length > 1) list.splice(-1, 1, `and ${list[list.length - 1]}`);

                if (mentionedAFKUsers.size > 5) return; // idec at that point;
                if (mentionedAFKUsers.size > 1)
                    return message.reply({
                        content: `${
                            [...mentionedAFKUsers.values()].length === 2 ? list.join(' ') : list.join(', ')
                        } are currently AFK!`,
                        allowedMentions: { users: [] }
                    });
                const userAFKInformation = afks.find(afk => afk.userID === mentionedAFKUsers.first().id);

                if (Date.now() - userAFKInformation.date <= 5000) return;
                if (mentionedAFKUsers.first().id !== message.author.id)
                    return message.reply({
                        content: `${mentionedAFKUsers.first()} went AFK ${client.util.timestamp(
                            userAFKInformation.date,
                            { relative: true }
                        )} ${userAFKInformation.reason ? `-  ${userAFKInformation.reason}` : ''}`,
                        allowedMentions: { users: [] }
                    });
            }

            if (afks.some(afk => afk.userID === message.author.id && Date.now() - afk.date >= 5000)) {
                await afkSchema.updateOne(
                    {
                        guildID: message.guild.id
                    },
                    {
                        $pull: {
                            afks: {
                                userID: message.author.id
                            }
                        }
                    }
                );

                if (message.member.displayName.startsWith('[AFK] '))
                    await message.member.setNickname(`${message.member.displayName.slice(5)}`).catch(() => {});

                const msg = await message.reply(`Welcome back, I removed your AFK`);
                return setTimeout(() => msg.delete(), 5000);
            }

            return;
        }

        const args = message.content.split(' ');
        const cmd = prefix.includes(' ') ? args[1].toLowerCase() : args.shift().slice(prefix.length).toLowerCase();
        if (prefix.includes(' ')) args.splice(0, 2);

        const denyAccess = commandName => {
            if (errorConfig.missingPermission === 'delete') return message.delete();
            if (errorConfig.missingPermission === 'ignore') return;

            const errorMessage = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setAuthor('Access Denied')
                .setDescription(`You do not have permission to run the \`${commandName}\` command`);

            if (errorConfig.deleteDelay !== 'never')
                return message.reply({ embeds: [errorMessage] }).then(msg => {
                    setTimeout(() => {
                        msg.delete();
                        message.delete().catch(() => {});
                    }, 3000);
                });
        };

        const missingPerms = commandRequiredBotPermission => {
            if (command.requiredBotPermission && !message.guild.me.permissions.has(command.requiredBotPermission)) {
                let missingPermission = new Discord.Permissions(commandRequiredBotPermission);
                missingPermission = missingPermission.toArray();
                if (missingPermission.length > 1) missingPermission = 'ADMINISTRATOR';
                else missingPermission = missingPermission[0].replaceAll('_', ' ');
                const missingPermissionEmbed = new Discord.MessageEmbed()
                    .setColor(client.config.colors.err)
                    .setAuthor(`Missing Permissions`)
                    .setDescription(
                        `I am missing required permissions for this command to work\nMissing Permission: \`${missingPermission}\``
                    );

                return message.reply({ embeds: [missingPermissionEmbed] });
            }
        };

        const { shortcutCommands } = settings;
        if (shortcutCommands.some(command => command.name === cmd)) {
            if (
                !client.cache.whitelistedUsers.includes(message.author.id) ||
                !client.cache.whitelistedUsers.includes(message.author.id)
            ) {
                if (client.helpers.blacklist.check(message.author.id).isBlacklisted === true) return;
                client.cache.whitelistedUsers.push(message.author.id);
                if (client.helpers.blacklist.check(message.author.id, true).isBlacklisted) return;
                client.cache.whitelistedUsers.push(message.guild.id);
            }

            const shortcmd = shortcutCommands.find(command => command.name === cmd);

            if (client.commands.has(shortcmd.name) || client.aliases.has(shortcmd.name)) {
                return message.reply(
                    'What a strange error! It seems this command has became a built in command or command alias. Please remove this shortcut command to use the built in version of this command'
                );
            }

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

            if (
                !message.member.permissions.has(permissions) &&
                (!isModerator || !new Discord.Permissions(modRolePermissions).has(permissions))
            )
                return denyAccess(shortcmd.name);
            if (!message.guild.me.permissions.has(permissions) && permissions !== 'warn')
                return missingPerms(permissions.replace(pemissions.toUpperCase().replace('_', ' ').replace('_', ' ')));

            if (
                shortcmd.type === 'mute' ||
                shortcmd.type === 'tempmute' ||
                shortcmd.type === 'ban' ||
                shortcmd.type === 'tempban'
            ) {
                if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_user);
                member =
                    (await client.util.getMember(message.guild, args[0])) ||
                    (await client.util.getUser(client, args[0]));
                if (!member) return client.util.throwError(message, client.config.errors.missing_argument_user);

                if (member.user) {
                    if (member.id === client.user.id)
                        return client.util.throwError(message, client.config.errors.cannot_punish_myself);
                    if (member.id === message.member.id)
                        return client.util.throwError(message, client.config.errors.cannot_punish_yourself);
                    if (
                        member.roles.highest.position >= message.member.roles.highest.position &&
                        message.member.id !== message.guild.ownerId
                    )
                        return client.util.throwError(message, client.config.errors.hierarchy);
                    if (member.roles.highest.position >= message.guild.me.roles.highest.position)
                        return client.util.throwError(message, client.config.errors.my_hierarchy);
                    if (member === message.guild.owner)
                        return client.util.throwError(message, client.config.errors.cannot_punish_owner);
                }

                if (shortcmd.type === 'ban' || shortcmd.type === 'tempban') {
                    const alreadyBanned = await message.guild.bans
                        .fetch()
                        .then(bans => bans.find(ban => ban.user.id === member.id));
                    if (alreadyBanned) return client.util.throwError(message, 'This user is already banned');

                    const { baninfo } = settings;

                    if (member.user)
                        await new DMUserInfraction(
                            client,
                            'banned',
                            client.config.colors.punishment[2],
                            message,
                            member,
                            {
                                reason: shortcmd.reason,
                                punishmentID: punishmentID,
                                time: duration,
                                baninfo: baninfo !== 'none' ? baninfo : null
                            }
                        );
                    new ModerationLogger(client, 'Banned', message.member, member, message.channel, {
                        reason: shortcmd.reason,
                        duration: shortcmd.duration,
                        punishmentID: punishmentID
                    });
                    await message.guild.members.ban(member.id, { reason: shortcmd.reason });
                    new Infraction(client, 'Ban', message, message.member, member, {
                        reason: shortcmd.reason,
                        punishmentID: punishmentID,
                        time: duration,
                        auto: false
                    });
                    if (shortcmd.type === 'tempban')
                        new Punishment(message.guild.name, message.guild.id, 'ban', member.id, {
                            reason: shortcmd.reason,
                            time: duration ? Date.now() + duration : 'Never'
                        });
                } else if (shortcmd.type === 'mute' || shortcmd.type === 'tempmute') {
                    const hasMuteRecord = await punishmentSchema.findOne({
                        guildID: message.guild.id,
                        userID: member.id,
                        type: 'mute'
                    });

                    if (member?.permissions?.has(Discord.Permissions.FLAGS.MANAGE_ROLES) && !removerolesonmute)
                        return client.util.throwError(
                            message,
                            'This command may not be effective on this member | If you have the **Remove Roles On Mute** module enabled, this may work'
                        );

                    const role = message.guild.roles.cache.get(muterole) || (await client.util.createMuteRole(message));

                    if (role.position >= message.guild.me.roles.highest.position)
                        return client.util.throwError(message, 'My hierarchy is too low to manage the muted role');

                    if (member?.roles?.cache?.has(role.id))
                        return client.util.throwError(message, 'This user already currently muted');
                    else if (hasMuteRecord) {
                        await punishmentSchema.deleteMany({
                            guildID: message.guild.id,
                            userID: member.id,
                            type: 'mute'
                        });
                    }

                    const memberRoles = removerolesonmute ? member.roles.cache.map(roles => roles.id) : [];
                    const unmanagableRoles = removerolesonmute
                        ? member.roles.cache.filter(roles => roles.managed).map(roles => roles.id)
                        : [];

                    if (removerolesonmute) await member.roles.set([role, ...unmanagableRoles]);
                    else await client.util.muteMember(message, member, role);

                    new Infraction(client, 'Mute', message, message.member, member, {
                        reason: shortcmd.reason,
                        punishmentID: punishmentID,
                        time: duration,
                        auto: false
                    });
                    new Punishment(message.guild.name, message.guild.id, 'mute', member.id, {
                        reason: shortcmd.reason,
                        time: duration ? Date.now() + duration : 'Never',
                        roles: memberRoles
                    });
                    new DMUserInfraction(client, 'muted', client.config.colors.punishment[1], message, member, {
                        reason: shortcmd.reason,
                        punishmentID: punishmentID,
                        time: duration
                    });
                    new ModerationLogger(client, 'Muted', message.member, member, message.channel, {
                        reason: shortcmd.reason,
                        duration: duration,
                        punishmentID: punishmentID
                    });
                }
            } else {
                if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_member);
                member = await client.util.getMember(message.guild, args[0]);
                if (!member) return client.util.throwError(message, client.config.errors.missing_argument_member);

                if (member.id === client.user.id)
                    return client.util.throwError(message, client.config.errors.cannot_punish_myself);
                if (member.id === message.member.id)
                    return client.util.throwError(message, client.config.errors.cannot_punish_yourself);
                if (
                    member.roles.highest.position >= message.member.roles.highest.position &&
                    message.member.id !== message.guild.ownerId
                )
                    return client.util.throwError(message, client.config.errors.hierarchy);
                if (shortcmd.type === 'kick')
                    if (member.roles.highest.position >= message.guild.me.roles.highest.position)
                        return client.util.throwError(message, client.config.errors.my_hierarchy);
                if (member === message.guild.owner)
                    return client.util.throwError(message, client.config.errors.cannot_punish_owner);

                if (shortcmd.type === 'kick') {
                    new DMUserInfraction(client, 'kicked', client.config.colors.punishment[1], message, member, {
                        reason: shortcmd.reason,
                        punishmentID: punishmentID,
                        time: 'ignore'
                    });

                    await message.guild.members.kick(member, { reason: shortcmd.reason });

                    new Infraction(client, 'Kick', message, message.member, member, {
                        reason: shortcmd.reason,
                        punishmentID: punishmentID,
                        time: null,
                        auto: false
                    });
                    new ModerationLogger(client, 'Kicked', message.member, member, message.channel, {
                        reason: shortcmd.reason,
                        duration: null,
                        punishmentID: punishmentID
                    });
                } else if (shortcmd.type === 'warn') {
                    new Infraction(client, 'Warn', message, message.member, member, {
                        reason: shortcmd.reason,
                        punishmentID: punishmentID,
                        time: shortcmd.duration,
                        auto: false
                    });
                    new DMUserInfraction(client, 'warned', client.config.colors.punishment[1], message, member, {
                        reason: shortcmd.reason,
                        punishmentID: punishmentID,
                        time: shortcmd.duration
                    });
                    new ModerationLogger(client, 'Warned', message.member, member, message.channel, {
                        reason: shortcmd.reason,
                        duration: shortcmd.duration,
                        punishmentID: punishmentID
                    });
                }
            }

            const { delModCmds } = settings;
            if (delModCmds) message.delete();

            const punishedEmbed = new Discord.MessageEmbed();
            if (shortcmd.type === 'warn') punishedEmbed.setColor(client.config.colors.punishment[0]);
            if (shortcmd.type === 'kick') punishedEmbed.setColor(client.config.colors.punishment[1]);
            if (shortcmd.type === 'mute' || shortcmd.type === 'tempmute')
                punishedEmbed.setColor(client.config.colors.punishment[1]);
            if (shortcmd.type === 'ban' || shortcmd.type === 'tempban')
                punishedEmbed.setColor(client.config.colors.punishment[2]);
            const stype = shortcmd.type.replace('temp', '');
            punishedEmbed.setDescription(
                `${client.config.emotes.success} **${member.user ? member.toString() : member.tag}** has been ${(
                    stype.charAt(0).toUpperCase() +
                    stype.slice(1) +
                    (stype.endsWith('e') ? '' : stype.endsWith('ban') ? 'ne' : 'e')
                ).toLowerCase()}d with ID \`${punishmentID}\``
            );

            return message.channel.send({ embeds: [punishedEmbed] });
        }

        const command = client.commands.get(cmd) || client.commands.get(client.aliases.get(cmd));
        if (!command) return;

        if (!client.cache.whitelistedUsers.includes(message.author.id)) {
            const userBlacklist = await client.helpers.blacklist.check(message.author.id);
            if (userBlacklist.isBlacklisted) {
                if (userBlacklist.sent) return;
                return client.helpers.blacklist.DMUserBlacklist(
                    client,
                    message.author.id,
                    userBlacklist.reason,
                    userBlacklist.date
                );
            }

            client.cache.whitelistedUsers.push(message.author.id);
        }

        if (!client.cache.whitelistedServers.includes(message.guild.id)) {
            const serverBlacklist = await client.helpers.blacklist.check(message.guild.id, true);

            if (serverBlacklist.isBlacklisted) {
                if (serverBlacklist.sent) return message.guild.leave();
                return client.helpers.blacklist.sendServerBlacklist(
                    client,
                    message,
                    serverBlacklist.reason,
                    serverBlacklist.date
                );
            }

            client.cache.whitelistedServers.push(message.guild.id);
        }

        const cooldownInformation = client.helpers.cooldown.check(message.author.id);
        if (cooldownInformation.inCooldown === true) {
            if (cooldownInformation.hard) return;
            else {
                if (cooldownInformation.triggered) return client.helpers.cooldown.makeHard(message.author.id);
                client.helpers.cooldown.makeTriggered(message.author.id);
                return client.util.throwError(
                    message,
                    `too fast: please wait a few moments before running another command`
                );
            }
        } else client.helpers.cooldown.add(message.author.id);

        if (command.developing && !client.config.developers.some(ID => ID === message.author.id)) return;
        if (command.developer && !client.config.developers.some(ID => ID === message.author.id))
            return client.util.throwError(message, 'developer commands cannot be ran by non-developers');

        if (
            command.permissions &&
            !message.member.permissions.has(command.permissions) &&
            (!isModerator || !new Discord.Permissions(modRolePermissions).has(command.permissions))
        )
            return denyAccess(command.name);

        if (command.requiredBotPermission && !message.guild.me.permissions.has(command.requiredBotPermission))
            return missingPerms(command.requiredBotPermission);

        if (locked.includes(message.channel.id) || locked.includes(message.channel.parentId)) {
            if (
                !message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
                !isModerator &&
                !command.developer &&
                command.name !== 'tag'
            ) {
                if (errorConfig.disabledCommandChannel === 'delete') return message.delete();
                if (errorConfig.disabledCommandChannel === 'ignore') return;

                const msg = await message.reply('Commands are disabled in this channel');

                if (errorConfig.deleteDelay !== 'never')
                    return setTimeout(() => {
                        message.delete();
                        msg.delete();
                    }, 3000);
            }
        }

        try {
            command.execute(client, message, args);
        } catch {
            return;
        }
    }
};
