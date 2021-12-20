const Discord = require('discord.js');
const punishmentSchema = require('../../schemas/punishment-schema');
const settingsSchema = require('../../schemas/settings-schema');
const warningSchema = require('../../schemas/warning-schema');

module.exports = {
    name: 'unmute',
    description: 'Unmutes a member allowing them to speak in the server',
    usage: 'unmute [member]\nunmute [member] <reason>',
    permissions: Discord.Permissions.FLAGS.MANAGE_ROLES,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_ROLES,
    aliases: ['unshut', 'um'],
    async execute(client, message, args) {
        if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_member);

        const reason = args.slice(1).join(' ') || 'Unspecified';
        const punishmentID = client.util.createSnowflake();

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        });
        const { delModCmds } = settings;

        const member = await client.util.getMember(message.guild, args[0]);
        if (!member && (await client.util.getUser(client, args[0]))) {
            const user = await client.util.getUser(client, args[0]);

            let hasMuteRecord = await punishmentSchema.findOne({
                guildID: message.guild.id,
                userID: user.id,
                type: 'mute'
            });

            if (!hasMuteRecord) return client.util.throwError(message, 'this user is not currently muted');
            if (delModCmds) message.delete();

            await client.punishmentManager.createInfraction(client, 'Unmute', message, message.member, user, {
                reason: reason,
                punishmentID: punishmentID,
                time: null,
                auto: false
            });
            await client.punishmentManager.createModerationLog(
                client,
                'Unmuted',
                message.member,
                user,
                message.channel,
                {
                    reason: reason,
                    duration: null,
                    punishmentID: punishmentID
                }
            );

            await punishmentSchema.deleteMany({
                guildID: message.guild.id,
                userID: user.id,
                type: 'mute'
            });

            return message.reply(`**${user.tag}** has been unmuted. They are not currently on this server`);
        }
        if (!member) return client.util.throwError(message, client.config.errors.invalid_member);

        const { muterole, removerolesonmute } = settings;
        const role = message.guild.roles.cache.get(muterole);

        if (!role) return client.util.throwError(message, 'the muted role does not exist');
        if (role.position >= message.guild.me.roles.highest.position)
            return client.util.throwError(message, client.config.errors.my_hierarchy);

        let hasMuteRecord = await punishmentSchema.findOne({
            guildID: message.guild.id,
            userID: member.id,
            type: 'mute'
        });

        const rolesToAdd = hasMuteRecord?.roles?.filter(
            role =>
                message.guild.roles.cache.get(role) &&
                !(role.managed && !member.roles.cache.has(role)) &&
                message.guild.roles.cache.get(role).position < message.guild.me.roles.highest.position
        );
        if (removerolesonmute && hasMuteRecord?.roles?.length) await member.roles.set(rolesToAdd);
        else member.roles.remove(role);

        if (!member.roles.cache.has(role.id) && !hasMuteRecord)
            return client.util.throwError(message, 'this user is not currently muted');
        if (delModCmds) message.delete();

        await punishmentSchema.deleteMany({
            guildID: message.guild.id,
            userID: member.id,
            type: 'mute'
        });

        const guildWarnings = await warningSchema.findOne({ guildID: message.guild.id });

        if (guildWarnings?.warnings?.length) {
            const mutesToExpire = guildWarnings.warnings.filter(
                warning => warning.expires > Date.now() && warning.type === 'Mute' && warning.userID === member.id
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

        await client.punishmentManager.createInfraction(client, 'Unmute', message, message.member, member, {
            reason: reason,
            punishmentID: punishmentID,
            time: null,
            auto: false
        });
        await client.punishmentManager.createUserInfractionDM(
            client,
            'unmuted',
            client.config.colors.main,
            message,
            member,
            {
                reason: reason,
                time: 'ignore',
                punishmentID: 'ignore'
            }
        );
        await client.punishmentManager.createModerationLog(client, 'Unmuted', message.member, member, message.channel, {
            reason: reason,
            duration: null,
            punishmentID: punishmentID
        });

        const unmutedEmbed = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(message.guild))
            .setDescription(`${client.config.emotes.success} ${member.toString()} has been unmuted`);

        return message.channel.send({ embeds: [unmutedEmbed] });
    }
};
