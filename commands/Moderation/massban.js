const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const Infraction = require('../../structures/Infraction');
const Punishment = require('../../structures/Punishment');
const warningSchema = require('../../schemas/warning-schema');
const punishmentSchema = require('../../schemas/punishment-schema');
const ms = require('ms');

module.exports = {
    name: 'massban',
    description: 'Ban multiple users at once, up to 20 members',
    usage: 'massban [...users]\nmassban [...users] * <duration>\nmassban [...users] * {reason}\nmassban [...users] * <duration> {reason}',
    requiredBotPermission: Discord.Permissions.FLAGS.BAN_MEMBERS,
    permissions: Discord.Permissions.FLAGS.BAN_MEMBERS,
    async execute(client, message, args) {
        const indexOfStar = args.includes('*') ? args.indexOf('*') : args.length;
        const rawUsers = args.slice(0, indexOfStar);
        if (!rawUsers.length) return client.util.throwError(message, 'you must provide at least 1 user to ban');
        if (rawUsers.length > 20) return client.util.throwError(message, 'you can only ban up to 20 users at once');

        const msg = await message.reply(`Validating the provided users, please wait...`);
        const resolveUser = async Id =>
            new Promise(async resolve => {
                const user =
                    (await client.util.getMember(message.guild, Id)) || (await client.util.getUser(client, Id));
                resolve(user);
            });

        const users = await Promise.all(rawUsers.map(user => resolveUser(user))).then(users =>
            users.filter(user => user)
        );

        if (!users.length) {
            msg.delete();
            return client.util.throwError(message, 'you must provide at least one __valid__ user to ban');
        }
        if (users.some(user => user.id === client.user.id)) {
            msg.delete();
            return client.util.throwError(message, client.config.errors.cannot_punish_myself);
        }
        if (users.some(user => user.id === message.author.id)) {
            msg.delete();
            return client.util.throwError(message, client.config.errors.cannot_punish_yourself);
        }
        if (
            users.some(
                user =>
                    user instanceof Discord.GuildMember &&
                    user.roles.highest.position >= message.member.roles.highest.position &&
                    !message.guild.ownerId === message.author.id
            )
        ) {
            msg.delete();
            return client.util.throwError(message, client.config.errors.hierarchy);
        }
        if (
            users.some(
                user =>
                    user instanceof Discord.GuildMember &&
                    user.roles.highest.position >= message.guild.me.roles.highest.position
            )
        ) {
            msg.delete();
            return client.util.throwError(message, client.config.errors.my_hierarchy);
        }

        const resolveBannedUser = async Id =>
            new Promise(async resolve => {
                const bannedUser = await message.guild.bans.fetch(Id).catch(() => false);
                resolve(bannedUser);
            });

        const bannedUsers = await Promise.all(users.map(user => resolveBannedUser(user.id)));
        if (bannedUsers.some(ban => ban))
            return client.util.throwError(message, 'you cannot ban users that are already banned');

        const pastArguments = args.join(' ').split(' * ')[1].split(' ');
        const __time = pastArguments[0];
        const time = parseInt(__time) && __time !== '' ? ms(__time) : null;
        if (time && time > 315576000000) return client.util.throwError(message, client.config.errors.time_too_long);
        const reason = time
            ? pastArguments.slice(1).join(' ') || 'Unspecified'
            : pastArguments.join(' ') || 'Unspecified';

        await msg.edit(`Banning ${users.length} users...`);

        const settings = await settingsSchema.findOne({ guildID: message.guild.id });
        const { baninfo } = settings;
        const guildWarnings = await warningSchema.findOne({ guildID: message.guild.id });

        let unsuccessfullyBannedUsers = [];

        for (let i = 0; i !== users.length; ++i) {
            const user = users[i];

            if (guildWarnings?.warnings) {
                const bansToExpire = guildWarnings.warnings.filter(
                    warning => warning.expires > Date.now() && warning.type === 'Ban' && warning.userID === user.id
                );

                if (bansToExpire.length) {
                    for (let i = 0; i !== bansToExpire.length; ++i) {
                        const ban = bansToExpire[i];
                        await warningSchema.updateOne(
                            {
                                guildID: message.guild.id,
                                warnings: {
                                    $elemMatch: {
                                        punishmentID: ban.punishmentID
                                    }
                                }
                            },
                            {
                                $set: {
                                    'warnings.$.expires': Date.now()
                                }
                            }
                        );
                    }
                }

                const punishmentID = client.util.createSnowflake();

                await punishmentSchema.deleteMany({
                    guildID: message.guild.id,
                    type: 'ban',
                    userID: user.id
                });

                if (user instanceof Discord.GuildMember)
                    await new DMUserInfraction(client, 'banned', client.config.colors.punishment[2], message, user, {
                        reason: reason,
                        punishmentID: punishmentID,
                        time: time,
                        baninfo: baninfo !== 'none' ? baninfo : null
                    });

                new ModerationLogger(client, 'Banned', message.member, user, message.channel, {
                    reason: reason,
                    duration: time,
                    punishmentID: punishmentID
                });

                await message.guild.members
                    .ban(user, { reason: reason })
                    .catch(() => unsuccessfullyBannedUsers.push(user));

                new Infraction(client, 'Ban', message, message.member, user, {
                    reason: reason,
                    punishmentID: punishmentID,
                    time: time,
                    auto: false
                });
                if (time)
                    new Punishment(message.guild.name, message.guild.id, 'ban', user.id, {
                        reason: reason,
                        time: time ? Date.now() + time : 'Never'
                    });
            }
        }

        await msg.edit(
            `${
                !unsuccessfullyBannedUsers
                    ? `Successfully banned **${
                          users.length - unsuccessfullyBannedUsers.length
                      }** users, failed to ban **${unsuccessfullyBannedUsers.length}** users`
                    : `Successfully banned all **${users.length}** users`
            }\nBanned users: ${users
                .filter(user => !unsuccessfullyBannedUsers.some(fail => fail.id === user.id))
                .map(user => user.toString())
                .join(', ')}\n\n${
                unsuccessfullyBannedUsers.length
                    ? `Failed to ban: ${unsuccessfullyBannedUsers.map(user => user.toString()).join(', ')}`
                    : ''
            }`
        );
    }
};
