const Discord = require('discord.js');
const ms = require('ms');
const settingsSchema = require('../../schemas/settings-schema');
const punishmentSchema = require('../../schemas/punishment-schema');

const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const NewInfraction = require('../../structures/NewInfraction');
const NewPunishment = require('../../structures/NewPunishment');

module.exports = {
    name: 'mute',
    description: 'Mutes a member denying their permission to speak in the rest of the server',
    usage: 'mute [member]\nmute [member] <reason>\nmute [member] <duration>\nmute [member] <duration> (reason)',
    permissions: 'MANAGE_ROLES',
    aliases: ['shut', 'stfu', 'm'],
    requiredBotPermission: 'MANAGE_ROLES',
    async execute(client, message, args) {

        if(!args[0]) return message.channel.send(client.config.errorMessages.missing_argument_member);

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

        const __time = args[1];
        const time = parseInt(__time) && __time !== '' ? ms(__time) : null
        if (time && time > 315576000000) return message.channel.send(client.config.errorMessages.time_too_long);
        const reason = time ? args.slice(2).join(' ') || 'Unspecified' : args.slice(1).join(' ') || 'Unspecified';

        const punishmentID = client.util.generateRandomBase62String();

        if(!member && await client.users.fetch(args[0]).catch(() => {})) {

            const user = await client.users.fetch(args[0]).catch(() => { });

            const hasMuteRecord = await punishmentSchema.findOne({
                guildID: message.guild.id,
                userID: user.id
            })

            if (hasMuteRecord) return message.channel.send('This user already currently muted');

            NewInfraction.run(client, 'Mute', message, user, reason, punishmentID, time, false);
            NewPunishment.run(message.guild.name, message.guild.id, 'mute', user.id, reason, time ? Date.now() + time : 'Never');
            ModerationLogger.run(client, 'Muted', message.member, user, message.channel, reason, time, punishmentID);

            return message.channel.send(`**${user.tag}** has been muted. They are not currently on the server, but when they rejoin they will be muted`);
        }

        if(!member) return message.channel.send(client.config.errorMessages.invalid_member);

        if (member.id === client.user.id) return message.channel.send(client.config.errorMessages.cannot_punish_myself);
        if (member.id === message.member.id) return message.channel.send(client.config.errorMessages.cannot_punish_yourself);
        if (member.roles.highest.position >= message.member.roles.highest.position && message.member !== message.guild.owner) return message.channel.send(client.config.errorMessages.hierarchy);
        if (member.roles.highest.position >= message.guild.me.roles.highest.position) return message.channel.send(client.config.errorMessages.my_hierarchy);
        if (member === message.guild.owner) return message.channel.send(client.config.errorMessages.cannot_punish_owner)

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        });
        const { delModCmds } = settings;
        if (delModCmds) message.delete();

        const role = message.guild.roles.cache.find(r => r.name === 'Muted') ? 
        message.guild.roles.cache.find(r => r.name === 'Muted') : 
        await client.util.createMuteRole(message);

        if(member.roles.cache.has(role.id)) return message.channel.send('This user is already muted!');

        await client.util.muteMember(message, member, role);

        NewInfraction.run(client, 'Mute', message, member, reason, punishmentID, time, false);
        NewPunishment.run(message.guild.name, message.guild.id, 'mute', member.id, reason, time ? Date.now() + time : 'Never');
        DMUserInfraction.run(client, 'muted', client.config.colors.punishment[1], message, member, reason, punishmentID, time)
        ModerationLogger.run(client, 'Muted', message.member, member, message.channel, reason, time, punishmentID)

        const mutedEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.punishment[1])
        .setDescription(`${client.config.emotes.success} ${member} has been muted with ID \`${punishmentID}\``)

        return message.channel.send(mutedEmbed);


    }
}