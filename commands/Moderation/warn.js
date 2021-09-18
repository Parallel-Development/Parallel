const settingsSchema = require('../../schemas/settings-schema');
const ms = require('ms');
const Discord = require('discord.js');

const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const Infraction = require('../../structures/Infraction');

module.exports = {
    name: 'warn',
    description: 'Issue a warning against a member',
    usage: 'warn [member]\nwarn [member] <reason>\nwarn [member] <duration> \nwarn [member] permanent (reason)\nwarn [member] <duration> (reason)',
    aliases: ['strike', 'w'],
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    async execute(client, message, args) {

        if (!args[0]) return await client.util.throwError(message, client.config.errors.missing_argument_member);

        const member = await client.util.getMember(message.guild, args[0])
        if (!member) return await client.util.throwError(message, client.config.errors.invalid_member);

        if (member.roles.highest.position >= message.member.roles.highest.position && message.member.id !== message.guild.ownerId) return await client.util.throwError(message, client.config.errors.hierarchy);
        if (member.id === client.user.id) return await client.util.throwError(message, client.config.errors.cannot_punish_myself);
        if (member.id === message.member.id) return await client.util.throwError(message, client.config.errors.cannot_punish_yourself);
        if (member === message.guild.owner) return await client.util.throwError(message, client.config.errors.cannot_punish_owner)

        const punishmentID = client.util.generateID();

        const __time = args[1];
        let time = parseInt(__time) && __time !== '' ? ms(__time) : null
        if (time && time > 315576000000) return await client.util.throwError(message, client.config.errors.time_too_long);
        const reason = time ? args.slice(2).join(' ') || 'Unspecified' : args.slice(1).join(' ') || 'Unspecified'

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        });

        const { manualwarnexpire } = settings
        const { delModCmds } = settings;
        if (delModCmds) message.delete();

        if (!time && manualwarnexpire !== 'disabled' && __time !== 'permament' && __time !== 'p' && __time !== 'forever') time = parseInt(manualwarnexpire);

        new Infraction(client, 'Warn', message, message.member, member, { reason: reason, punishmentID: punishmentID, time: time, auto: false });
        await new DMUserInfraction(client, 'warned', client.config.colors.punishment[1], message, member, { reason: reason, punishmentID: punishmentID, time: time })
        new ModerationLogger(client, 'Warned', message.member, member, message.channel, { reason: reason, duration: time, punishmentID: punishmentID })
        

        const warnedEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.punishment[0])
        .setDescription(`${client.config.emotes.success} ${member.toString()} has been warned with ID \`${punishmentID}\``)

        return message.channel.send({ embeds: [warnedEmbed] });
        
    }
}