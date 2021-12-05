const ms = require('ms');
const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const Infraction = require('../../structures/Infraction');
const Punishment = require('../../structures/Punishment');
const warningSchema = require('../../schemas/warning-schema');
const punishmentSchema = require('../../schemas/punishment-schema');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'ban',
    description: 'Bans a user from the server',
    usage: 'ban [member]\nban [member] <reason>\nban [member] <duration>\nban [member] <duration> (reason)',
    aliases: ['gtfo', 'banish', 'b'],
    permissions: Discord.Permissions.FLAGS.BAN_MEMBERS,
    requiredBotPermission: Discord.Permissions.FLAGS.BAN_MEMBERS,
    async execute (client, message, args) {
        const member =
            (await client.util.getMember(message.guild, args[0])) || (await client.util.getUser(client, args[0]));
        if (!member) return client.util.throwError(message, client.config.errors.invalid_member);

        const alreadyBanned = await message.guild.bans.fetch(member.id).catch(() => {});
        if (alreadyBanned) return client.util.throwError(message, 'This user is already banned');

        const __time = args[1];
        const time = parseInt(__time) && __time !== '' ? ms(__time) : null;
        if (time && time > 315576000000) return client.util.throwError(message, client.config.errors.time_too_long);
        const reason = time ? args.slice(2).join(' ') || 'Unspecified' : args.slice(1).join(' ') || 'Unspecified';

        if (member instanceof Discord.GuildMember) {
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

        const punishmentID = client.util.createSnowflake();

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        });
        const { baninfo } = settings;
        const { delModCmds } = settings;
        if (delModCmds) message.delete();

        const guildWarnings = await warningSchema.findOne({ guildID: message.guild.id });

        if (guildWarnings?.warnings?.length) {
            const bansToExpire = guildWarnings.warnings.filter(
                warning => warning.expires > Date.now() && warning.type === 'Ban' && warning.userID === member.id
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
        }

        await punishmentSchema.deleteMany({
            guildID: message.guild.id,
            type: 'ban',
            userID: member.id
        });

        if (member instanceof Discord.GuildMember)
            await new DMUserInfraction(client, 'banned', client.config.colors.punishment[2], message, member, {
                reason: reason,
                punishmentID: punishmentID,
                time: time,
                baninfo: baninfo !== 'none' ? baninfo : null
            });

        new ModerationLogger(client, 'Banned', message.member, member, message.channel, {
            reason: reason,
            duration: time,
            punishmentID: punishmentID
        });

        await message.guild.members.ban(member, { reason: reason });

        new Infraction(client, 'Ban', message, message.member, member, {
            reason: reason,
            punishmentID: punishmentID,
            time: time,
            auto: false
        });
        if (time)
            new Punishment(message.guild.name, message.guild.id, 'ban', member.id, {
                reason: reason,
                time: time ? Date.now() + time : 'Never'
            });

        const banEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.punishment[2])
            .setDescription(
                `${client.config.emotes.success} **${
                    member.user ? member : member.tag
                }** has been banned with ID \`${punishmentID}\``
            );

        return message.channel.send({ embeds: [banEmbed] });
    }
};