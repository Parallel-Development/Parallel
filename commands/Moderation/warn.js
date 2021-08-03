const settingsSchema = require('../../schemas/settings-schema');
const ms = require('ms');
const Discord = require('discord.js');

const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const NewInfraction = require('../../structures/NewInfraction');

module.exports = {
    name: 'warn',
    description: 'Warns a member',
    usage: 'warn [member]\nwarn [member] <reason>\nwarn [member] <duration> \nwarn [member] permanent (reason)\nwarn [member] <duration> (reason)',
    aliases: ['strike', 'w'],
    permissions: 'MANAGE_MESSAGES',
    async execute(client, message, args) {

        if(!args[0]) return message.reply(client.config.errorMessages.missing_argument_member);

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if(!member) return message.reply(client.config.errorMessages.invalid_member);

        if(member.roles.highest.position >= message.member.roles.highest.position && message.member !== message.guild.owner) return message.reply(client.config.errorMessages.hierarchy);
        if(member.id === client.user.id) return message.reply(client.config.errorMessages.cannot_punish_myself);
        if(member.id === message.member.id) return message.reply(client.config.errorMessages.cannot_punish_yourself);
        if(member === message.guild.owner) return message.reply(client.config.errorMessages.cannot_punish_owner)

        const punishmentID = client.util.generateRandomBase62String();

        const __time = args[1];
        let time = parseInt(__time) && __time !== '' ? ms(__time) : null
        if (time && time > 315576000000) return message.reply(client.config.errorMessages.time_too_long);
        const reason = time ? args.slice(2).join(' ') || 'Unspecified' : args.slice(1).join(' ') || 'Unspecified'

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        });

        const { manualwarnexpire } = settings
        const { delModCmds } = settings;
        if(delModCmds) message.delete();

        if (manualwarnexpire !== 'disabled' && __time !== 'permament' && __time !== 'p' && __time !== 'forever') time = parseInt(manualwarnexpire);

        NewInfraction.run(client, 'Warn', message, member, reason, punishmentID, time, false);
        DMUserInfraction.run(client, 'warned', client.config.colors.punishment[1], message, member, reason, punishmentID, time)
        ModerationLogger.run(client, 'Warned', message.member, member, message.channel, reason, time, punishmentID)
        

        const warnedEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.punishment[0])
        .setDescription(`${client.config.emotes.success} ${member} has been warned with ID \`${punishmentID}\``)

        return message.reply(warnedEmbed);
        
    }
}