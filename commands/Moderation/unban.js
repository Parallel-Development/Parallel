const Discord = require('discord.js');
const Infraction = require('../../structures/Infraction');
const ModerationLogger = require('../../structures/ModerationLogger');
const punishmentSchema = require('../../schemas/punishment-schema');
const warningSchema = require('../../schemas/warning-schema');
const settingsSchema = require('../../schemas/settings-schema');

module.exports = {
    name: 'unban',
    description: 'Unbans a member from the server',
    usage: 'unban [member]\nunban [member] <reason>',
    aliases: ['unbanish', 'pardon', 'revokeban'],
    permissions: Discord.Permissions.FLAGS.BAN_MEMBERS,
    requiredBotPermission: Discord.Permissions.FLAGS.BAN_MEMBERS,
    async execute(client, message, args) {
        if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_user);

        const user = await client.util.getUser(client, args[0]);
        if (!user) return client.util.throwError(message, client.config.errors.invalid_user);

        const reason = args.slice(1).join(' ') || 'Unspecified';

        if (!(await client.util.getUser(client, args[0])))
            return client.util.throwError(message, client.config.errors.invalid_user);
        const userBanned = await message.guild.bans.fetch(user.id).catch(() => {});
        if (!userBanned) return client.util.throwError(message, 'this user is not banned');

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        });

        const { delModCmds } = settings;
        if (delModCmds) message.delete();

        await message.guild.members.unban(user.id);

        await punishmentSchema.deleteMany({
            guildID: message.guild.id,
            userID: user.id,
            type: 'ban'
        });

        const guildWarnings = await warningSchema.findOne({ guildID: message.guild.id });

        if (guildWarnings?.warnings?.length) {
            const bansToExpire = guildWarnings.warnings.filter(
                warning => warning.expires > Date.now() && warning.type === 'Ban' && warning.userID === user.id
            );
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

        new Infraction(client, 'Unban', message, message.member, user, {
            reason: reason,
            punishmentID: punishmentID,
            time: null,
            auto: false
        });
        new ModerationLogger(client, 'Unbanned', message.member, user, message.channel, {
            reason: reason,
            duration: null,
            punishmentID: punishmentID
        });

        const unbannedEmbed = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(message.guild))
            .setDescription(`${client.config.emotes.success} **${user.tag}** has been unbanned`);

        return message.channel.send({ embeds: [unbannedEmbed] });
    }
};
