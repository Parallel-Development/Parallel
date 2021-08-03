const settingsSchema = require('../schemas/settings-schema');
const automodSchema = require('../schemas/automod-schema');
const blacklistSchema = require('../schemas/blacklist-schema');
const punishmentSchema = require('../schemas/punishment-schema');
const cooldown = new Set();
const doubleCooldown = new Set();

const ModerationLogger = require('../structures/ModerationLogger');
const DMUserInfraction = require('../structures/DMUserInfraction');
const NewInfraction = require('../structures/NewInfraction');
const NewPunishment = require('../structures/NewPunishment');

const Discord = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(client, message) {

        if (
            message.author.bot
            || !message.guild
            || !message.channel.permissionsFor(message.guild.me).toArray().includes('SEND_MESSAGES')
        ) return;

        const punishmentCheck = await punishmentSchema.findOne({
            userID: message.member.id,
            guildID: message.member.guild.id,
            type: 'mute'
        })

        if (punishmentCheck) {
            const { reason, expires, date } = punishmentCheck;
            const role = member.guild.roles.cache.find(r => r.name === 'Muted');
            if (!role) return;
            else {
                await message.member.roles.add(role).catch(() => { });
                const mutedEmbed = new Discord.MessageEmbed()
                    .setColor(client.config.colors.punishment[1])
                    .setAuthor(`You are currently muted in ${member.guild.name}`, client.user.displayAvatarURL())
                    .addField('Reason', reason)
                    .addField('Duration', expires !== 'Never' ? client.util.convertMillisecondsToDuration(expires) : 'Permanent', true)
                    .addField('Date', date, true)
                message.member.send(mutedEmbed).catch(() => { });

                return;

            }
        }

        const __settings = await settingsSchema.findOne({
            guildID: message.guild.id
        }).catch(() => { });

        if (!__settings) {
            await new settingsSchema({
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
                shortcmdCommands: []
            }).save()
        }

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        }).catch(() => { });

        const prefix = settings.prefix || client.config.prefix;
        const { delModCmds } = settings;

        const automodCheck = await automodSchema.findOne({
            guildID: message.guild.id
        })

        if(!automodCheck) {
            await new automodSchema({
                guildname: message.guild.name,
                guildID: message.guild.id,
                filter: 'disabled',
                filterList: [],
                fast: 'disabled',
                walltext: 'disabled',
                flood: 'disabled',
                links: 'disabled',
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
                bypassChannels: [],
                bypassRoles: []
            }).save();
        }

        const getModerators = await settingsSchema.findOne({
            guildID: message.guild.id
        });
        const isModerator = getModerators.modRoles.some(role => message.member.roles.cache.has(role));
        const channelBypassed = await automodSchema.findOne({
            guildID: message.guild.id,
            bypassChannels: message.channel.id
        })
        const isBlacklisted = await blacklistSchema.findOne({
            ID: message.author.id,
            server: false
        })
        const isBlacklistedServer = await blacklistSchema.findOne({
            ID: message.guild.id,
            server: true
        })

        let roleBypassed = false;
        for(var i = 0; i !== [...message.member.roles.cache.values()].length; ++i) {
            const x = await automodSchema.findOne({
                guildID: message.guild.id
            })
            const { bypassRoles } = x;
            const role = [...message.member.roles.cache.values()][i];
            if(bypassRoles.includes(role.id)) roleBypassed = true;
        }

        if (
            !message.member.permissions.has('MANAGE_MESSAGES') &&
            !isModerator &&
            (!channelBypassed || !channelBypassed.length) &&
            !roleBypassed
        ) require('../structures/AutomodChecks').run(client, message);



        if (
            new RegExp(`^<@!?${client.user.id}>`).test(message.content) &&
            !cooldown.has(message.author.id)
        ) {

            const cooldownWhitelist = client.config.developers;
            if (!cooldownWhitelist.includes(message.author.id)) {
                cooldown.add(message.author.id);
                setTimeout(() => {
                    cooldown.delete(message.author.id)
                }, 1500)
            }

            return message.reply(`My prefix is \`${prefix}\` | Run \`${prefix}help\` for a list of commands`)
        }

        if(!message.content.startsWith(prefix)) return;

        const args = message.content.split(' ');
        const cmd = args.shift().slice(prefix.length).toLowerCase();

        const denyAccess = (commandName) => {
            const errorMessage = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setAuthor('Access Denied')
                .setDescription(`You do not have permission to run the \`${commandName}\` command`)
            return message.reply(errorMessage).then(msg => {
                setTimeout(() => { message.delete(msg).catch(() => { }); msg.delete() }, 3000)
            })
        }

        const missingPerms = (commandRequiredBotPermissions) => {
            const missingPermissionEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setAuthor(`Missing Permissions`)
                .setDescription(`I am missing required permissions for this command to work\nMissing Permission: \`${commandRequiredBotPermissions}\``)

            return message.reply(missingPermissionEmbed)
        }

        for (var i = 0; i !== args.length; ++i) {
            const word = args[i];
            await message.guild.members.fetch(word).catch(() => { });
        }

        const { shortcutCommands } = settings;
        if (shortcutCommands.some(command => command.name === cmd)) {
            if (isBlacklisted || isBlacklistedServer) return message.react('🛑')

            const shortcmd = shortcutCommands.find(command => command.name === cmd);

            if (client.commands.has(shortcmd.name) || client.aliases.has(shortcmd.name)) {
                await settingsSchema.updateOne({
                    guildID: message.guild.id
                },
                    {
                        $pull: {
                            shortcmdCommands: {
                                name: shortcmd.name
                            }
                        }
                    })
                return message.reply('What a strange error! It seems this command has became a built in command or command alias. This shortcmd has been automatically removed')
            }

            let member;

            let permissions;
            if (shortcmd.type === 'warn') permissions = 'MANAGE_MESSAGES'
            else if (shortcmd.type === 'kick') permissions = 'KICK_MEMBERS'
            else if (shortcmd.type === 'mute' || shortcmd.type === 'tempmute') permissions = 'MANAGE_ROLES'
            else if (shortcmd.type === 'ban' || shortcmd.type === 'tempban') permissions = 'BAN_MEMBERS';

            const punishmentID = client.util.generateRandomBase62String();

            if (!message.member.permissions.has(permissions) && !isModerator) return denyAccess(shortcmd.name);
            if (!message.guild.me.permissions.has(permissions) && permissions !== 'warn') return missingPerms(permissions.replace(pemissions.toUpperCase().replace('_', ' ').replace('_', ' ')));

            if (shortcmd.type === 'mute' || shortcmd.type === 'tempmute' || shortcmd.type === 'ban' || shortcmd.type === 'tempban') {
                if (!args[0]) return message.reply(client.config.errorMessages.missing_argument_user)
                member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || await client.users.fetch(args[0]).catch(() => { })
                if (!member) return message.reply(client.config.errorMessages.missing_argument_user);

                if (member.user) {
                    if (member.id === client.user.id) return message.reply(client.config.errorMessages.cannot_punish_myself);
                    if (member.id === message.member.id) return message.reply(client.config.errorMessages.cannot_punish_yourself);
                    if (member.roles.highest.position >= message.member.roles.highest.position && message.member !== message.guild.owner) return message.reply(client.config.errorMessages.hierarchy);
                    if (member.roles.highest.position >= message.guild.me.roles.highest.position) return message.reply(client.config.errorMessages.my_hierarchy);
                    if (member === message.guild.owner) return message.reply(client.config.errorMessages.cannot_punish_owner)
                }

                if (shortcmd.type === 'ban' || shortcmd.type === 'tempban') {
                    const alreadyBanned = await message.guild.fetchBans().then(bans => bans.find(ban => ban.user.id === member.id));
                    if (alreadyBanned) return message.reply('This user is already banned');

                    const { baninfo } = settings;

                    if (member.user) await DMUserInfraction.run(client, 'banned', client.config.colors.punishment[2], message, member, shortcmd.reason, punishmentID, shortcmd.duration, baninfo !== 'none' ? baninfo : null);
                    ModerationLogger.run(client, 'Banned', message.member, member, message.channel, shortcmd.reason, shortcmd.duration, punishmentID);
                    await message.guild.membersBAN(member.id, { reason: shortcmd.reason });
                    NewInfraction.run(client, 'Ban', message, member, shortcmd.reason, punishmentID, shortcmd.duration, false);
                    if (shortcmd.type === 'tempban') NewPunishment.run(message.guild.name, message.guild.id, 'ban', member.id, shortcmd.reason, shortcmd.duration ? Date.now() + shortcmd.duration : 'Never');

                } else if (shortcmd.type === 'mute' || shortcmd === 'tempmute') {

                    const hasMuteRecord = await punishmentSchema.findOne({
                        guildID: message.guild.id,
                        userID: member.id
                    })

                    if (hasMuteRecord) return message.reply('This user already currently muted');

                    if (member.user) {

                        if (message.member.roles.cache.has(message.guild.roles.cache.find(r => r.name === 'Muted'))) return message.reply('This user already currently muted');

                        const role = message.guild.roles.cache.find(r => r.name === 'Muted') ?
                            message.guild.roles.cache.find(r => r.name === 'Muted') :
                            await client.util.createMuteRole(message);

                        if (member.roles.cache.has(role.id)) return message.reply('This user is already currently muted!');

                        await client.util.muteMember(message, member, role);
                    }

                    NewInfraction.run(client, 'Mute', message, user, shortcmd.reason, punishmentID, shortcmd.duration, false);
                    NewPunishment.run(message.guild.name, message.guild.id, 'mute', user.id, shortcmd.reason, shortcmd.duration ? Date.now() + shortcmd.duration : 'Never');
                    ModerationLogger.run(client, 'Muted', message.member, user, message.channel, shortcmd.reason, shortcmd.duration, punishmentID);
                }


            } else {
                if (!args[0]) return message.reply(client.config.errorMessages.missing_argument_member)
                member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
                if (!member) return message.reply(client.config.errorMessages.missing_argument_member);

                if (member.id === client.user.id) return message.reply(client.config.errorMessages.cannot_punish_myself);
                if (member.id === message.member.id) return message.reply(client.config.errorMessages.cannot_punish_yourself);
                if (member.roles.highest.position >= message.member.roles.highest.position && message.member !== message.guild.owner) return message.reply(client.config.errorMessages.hierarchy);
                if (shortcmd.type === 'kick') if (member.roles.highest.position >= message.guild.me.roles.highest.position) return message.reply(client.config.errorMessages.my_hierarchy);
                if (member === message.guild.owner) return message.reply(client.config.errorMessages.cannot_punish_owner);

                if (shortcmd.type === 'kick') {
                    DMUserInfraction.run(client, 'kicked', client.config.colors.punishment[1], message, member, shortcmd.reason, punishmentID, shortcmd.duration);

                    await memberKICK(reason);

                    NewInfraction.run(client, 'Kick', message, member, shortcmd.reason, punishmentID, shortcmd.reason, false);
                    ModerationLogger.run(client, 'Kicked', message.member, member, message.channel, reason, time, punishmentID)
                } else if (shortcmd.type === 'warn') {

                    NewInfraction.run(client, 'Warn', message, member, shortcmd.reason, punishmentID, shortcmd.duration, false);
                    DMUserInfraction.run(client, 'warned', client.config.colors.punishment[1], message, member, shortcmd.reason, punishmentID, shortcmd.duration)
                    ModerationLogger.run(client, 'Warned', message.member, member, message.channel, shortcmd.reason, shortcmd.duration, punishmentID)
                }


            }

            const { delModCmds } = settings;
            if(delModCmds) message.delete();

            const punishedEmbed = new Discord.MessageEmbed()
            if(shortcmd.type === 'warn') punishedEmbed.setColor(client.config.colors.punishment[0]);
            if (shortcmd.type === 'kick') punishedEmbed.setColor(client.config.colors.punishment[1]);
            if (shortcmd.type === 'mute' || shortcmd.type === 'tempmute') punishedEmbed.setColor(client.config.colors.punishment[1]);
            if (shortcmd.type === 'ban' || shortcmd.type === 'tempban') punishedEmbed.setColor(client.config.colors.punishment[2]);
            const stype = shortcmd.type === 'tempmute' ? 'mute' : shortcmd.type
            punishedEmbed.setDescription(`${client.config.emotes.success} **${member.user ? member : member.tag}** has been ${(stype.charAt(0).toUpperCase() + stype.slice(1) + (stype.endsWith('e') ? '' : stype.endsWith('ban') ? 'ne' : 'e')).toLowerCase()}d with ID \`${punishmentID}\``);

            return message.reply(punishedEmbed);
        }

        const command = client.commands.get(cmd) || client.commands.get(client.aliases.get(cmd));
        if (!command) return;

        if(isBlacklisted) {

            const { reason, date, sent } = isBlacklisted;
            if (sent) return;

            const blacklistEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setDescription(`Unfortunately, you were blacklisted from this bot. This means the bot will ignores all your commands. If you believe this ban is unjustified, you can submit an appeal [here](https://docs.google.com/document/d/15EwKPOPvlIO5iSZj-qQyBjmQ5X7yKHlijW9wCiDfffM/edit)`)
                .setAuthor('You are blacklisted from this bot!', client.user.displayAvatarURL())
                .addField('Reason', reason)
                .addField('Date', date)
                .setFooter('You cannot appeal your ban if it is not unjustified!');
            message.react('🛑').catch(() => { })
            message.author.send(blacklistEmbed).catch(() => {  })

            await blacklistSchema.updateOne({
                ID: message.author.id,
                server: false
            },
                {
                    sent: true
                })

            return;

        }

        if(isBlacklistedServer) {

            const { reason, date, sent } = isBlacklistedServer;
            if (!sent) {

                message.reply(`This server is blacklisted!\n\nReason: ${reason}\nDate: ${date}`)

                await blacklistSchema.updateOne({
                    ID: message.author.id,
                    server: false
                },
                {
                    sent: true
                }
            )}

            return message.guild.leave();
        };

        if (doubleCooldown.has(message.author.id)) return;
        if(cooldown.has(message.author.id)) {
            message.reply('You are on cooldown');
            doubleCooldown.add(message.author.id);
            return setTimeout(() => { doubleCooldown.delete(message.author.id) }, 3000)
        } else if(!client.config.developers.includes(message.author.id)) {
            cooldown.add(message.author.id);
            setTimeout(() => { cooldown.delete(message.author.id); }, 1500)
        }


        if(command.developing && !client.config.developers.includes(message.author.id)) return;

        if (
            command.permissions &&
            !message.member.permissions.has(command.permissions)
        ) {

            if (
                command.permissions === 'MANAGE_MESSAGES'
                || command.permissions === 'BAN_MEMBERS'
                || command.permissions === 'KICK_MEMBERS'
                || command.permissions === 'MANAGE_NICKNAMES'
                || command.permissions === 'MANAGE_ROLES'
                || command.permissions === 'MANAGE_CHANNELS'
            ) {
                if(!isModerator) return denyAccess(command.name);
            } else return denyAccess();
        }

        if (command.requiredBotPermissions && !message.guild.me.permissions.has(command.requiredBotPermission)) return missingPerms(command.requiredBotPermission.toUpperCase().replace('_', ' ').replace('_', ' '));

        if (
            await settingsSchema.findOne({
                guildID: message.guild.id,
                locked: message.channel.id
            }) ||
            await settingsSchema.findOne({
                guildID: message.guild.id,
                locked: message.channel.parentID
            })
        ) {
            if (!message.member.permissions.has('MANAGE_MESSAGES') && !isModerator) {
                const msg = await message.reply('Commands are disabled in this channel');
                setTimeout(() => {
                    message.delete();
                    msg.delete();
                }, 3000);
                return;
            }
        }

        try { command.execute(client, message, args) }
        catch { return; }
    }
}
