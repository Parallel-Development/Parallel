const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const Infraction = require('../../structures/Infraction');

module.exports = {
    name: 'kick',
    description: 'Kick a member from the server',
    usage: 'kick [member]\nkick [member] <reason>',
    aliases: ['k', 'boot'],
    permissions: Discord.Permissions.FLAGS.KICK_MEMBERS,
    requiredBotPermission: Discord.Permissions.FLAGS.KICK_MEMBERS,
    async execute(client, message, args) {
        if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_member);

        const member = await client.util.getMember(message.guild, args[0]);
        if (!member) return client.util.throwError(message, client.config.errors.invalid_member);

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

        const punishmentID = client.util.createSnowflake();

        const reason = args.slice(1).join(' ') || 'Unspecified';

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        });

        const { delModCmds } = settings;
        if (delModCmds) message.delete();

        await new DMUserInfraction(client, 'kicked', client.config.colors.punishment[1], message, member, {
            reason: reason,
            punishmentID: punishmentID,
            time: 'ignore'
        });

        await member.kick(reason);

        new Infraction(client, 'Kick', message, message.member, member, {
            reason: reason,
            punishmentID: punishmentID,
            time: null,
            auto: false
        });
        new ModerationLogger(client, 'Kicked', message.member, member, message.channel, {
            reason: reason,
            duration: null,
            punishmentID: punishmentID
        });

        const warnedEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.punishment[1])
            .setDescription(
                `${client.config.emotes.success} ${member.toString()} has been kicked with ID \`${punishmentID}\``
            );

        return message.channel.send({ embeds: [warnedEmbed] });
    }
};
