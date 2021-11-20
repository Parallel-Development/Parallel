const Discord = require('discord.js');
const ms = require('ms');
const settingsSchema = require('../../schemas/settings-schema');
const punishmentSchema = require('../../schemas/punishment-schema');
const warningSchema = require('../../schemas/warning-schema');

const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const Infraction = require('../../structures/Infraction');
const Punishment = require('../../structures/Punishment');

module.exports = {
    name: 'mute',
    description: 'Mutes a member denying their permission to speak in the rest of the server',
    usage: 'mute [member]\nmute [member] <reason>\nmute [member] <duration>\nmute [member] <duration> (reason)',
    permissions: Discord.Permissions.FLAGS.MANAGE_ROLES,
    aliases: ['shut', 'stfu', 'm'],
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_ROLES,
    async execute(client, message, args) {
        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        });

        const { muterole, delModCmds, removerolesonmute } = settings;

        if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_user);

        const member = await client.util.getMember(message.guild, args[0]);
        if (member && member.permissions.has(Discord.Permissions.FLAGS.MANAGE_ROLES) && !removerolesonmute)
            return message.reply(
                'This command may not be effective on this member | If you have the **Remove Roles On Mute** module enabled, this may work'
            );

        const __time = args[1];
        const time = parseInt(__time) && __time !== '' ? ms(__time) : null;
        if (time && time > 315576000000) return client.util.throwError(message, client.config.errors.time_too_long);
        const reason = time ? args.slice(2).join(' ') || 'Unspecified' : args.slice(1).join(' ') || 'Unspecified';

        const punishmentID = client.util.generateID();

        if (!member && (await client.util.getUser(client, args[0]))) {
            const user = await client.util.getUser(client, args[0]);

            let hasMuteRecord = await punishmentSchema.findOne({
                guildID: message.guild.id,
                userID: user.id,
                type: 'mute'
            });

            if (hasMuteRecord) return client.util.throwError(message, 'This user already currently muted');

            new Infraction(client, 'Mute', message, message.member, user, {
                reason: reason,
                punishmentID: punishmentID,
                time: time,
                auto: false
            });
            new Punishment(message.guild.name, message.guild.id, 'mute', user.id, {
                reason: reason,
                time: time ? Date.now() + time : 'Never'
            });
            new ModerationLogger(client, 'Muted', message.member, user, message.channel, {
                reason: reason,
                duration: time,
                punishmentID: punishmentID
            });

            return message.reply(
                `**${user.tag}** has been muted. They are not currently on the server, but when they rejoin they will be muted`
            );
        }

        if (!member) return client.util.throwError(message, client.config.errors.invalid_member);

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
            if (member.id === message.guild.ownerId)
                return client.util.throwError(message, client.config.errors.cannot_punish_owner);
        }

        let hasMuteRecord = await punishmentSchema.findOne({
            guildID: message.guild.id,
            userID: member.id,
            type: 'mute'
        });

        const role = message.guild.roles.cache.get(muterole) || (await client.util.createMuteRole(message));

        if (role.position >= message.guild.me.roles.highest.position)
            return client.util.throwError(message, 'My hierarchy is too low to manage the muted role');

        if (member.roles.cache.has(role.id))
            return client.util.throwError(message, 'This user is already currently muted!');
        else if (hasMuteRecord) {
            await punishmentSchema.deleteMany({
                guildID: message.guild.id,
                userID: member.id,
                type: 'mute'
            });

            const guildWarnings = await warningSchema.findOne({ guildID: message.guild.id });
            const mutesToExpire = guildWarnings.warnings.filter(
                warning => warning.expires > Date.now() && warning.type === 'Mute'
            );

            for (let i = 0; i !== mutesToExpire.length; ++i) {
                const mute = mutesToExpire[i];

                await warningSchema.updateOne(
                    {
                        guildID: message.guild.id,
                        warnings: {
                            $elemMatch: {
                                punishmentID: mute.punishmentID
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

        if (delModCmds) message.delete();

        const memberRoles = removerolesonmute ? member.roles.cache.map(roles => roles.id) : [];
        const unmanagableRoles = member.roles.cache.filter(role => role.managed).map(roles => roles.id);

        if (removerolesonmute) {
            await member.voice.disconnect().catch(() => {});
            await member.roles.set([role, ...unmanagableRoles]);
        } else await client.util.muteMember(message, member, role);

        new Infraction(client, 'Mute', message, message.member, member, {
            reason: reason,
            punishmentID: punishmentID,
            time: time,
            auto: false
        });
        new Punishment(message.guild.name, message.guild.id, 'mute', member.id, {
            reason: reason,
            time: time ? Date.now() + time : 'Never',
            roles: memberRoles
        });
        new DMUserInfraction(client, 'muted', client.config.colors.punishment[1], message, member, {
            reason: reason,
            punishmentID: punishmentID,
            time: time
        });
        new ModerationLogger(client, 'Muted', message.member, member, message.channel, {
            reason: reason,
            duration: time,
            punishmentID: punishmentID
        });

        const mutedEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.punishment[1])
            .setDescription(
                `${client.config.emotes.success} ${member.toString()} has been muted with ID \`${punishmentID}\``
            );

        return message.channel.send({ embeds: [mutedEmbed] });
    }
};
