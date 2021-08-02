const ms = require('ms');
const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const NewInfraction = require('../../structures/NewInfraction');
const NewPunishment = require('../../structures/NewPunishment');

module.exports = {
    name: 'ban',
    description: 'Bans a member from the server',
    usage: 'ban [member]\nban [member] <reason>\nban [member] <duration>\nban [member] <duration> (reason)',
    aliases: ['gtfo', 'banish', 'b'],
    permissions: 'BAN_MEMBERS',
    requiredBotPermission: 'BAN_MEMBERS',
    async execute(client, message, args) {

        if(!args[0]) return message.channel.send(client.config.errorMessages.missing_argument_member);

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || await client.users.fetch(args[0]).catch(() => { });
        if(!member) return message.channel.send(client.config.errorMessages.invalid_member);

        const alreadyBanned = await message.guild.fetchBans().then(bans => bans.find(ban => ban.user.id === member.id));
        if(alreadyBanned) return message.channel.send('This user is already banned')

        const __time = args[1];
        const time = parseInt(__time) && __time !== '' ? ms(__time) : null
        if (time && time > 315576000000) return message.channel.send(client.config.errorMessages.time_too_long);
        const reason = time ? args.slice(2).join(' ') || 'Unspecified' : args.slice(1).join(' ') || 'Unspecified'

        // user is only a property of a member object, so checking if(member.user) checks if the member is an actual guild member, 
        // or a user

        if(member.user) {
            if (member.id === client.user.id) return message.channel.send(client.config.errorMessages.cannot_punish_myself);
            if (member.id === message.member.id) return message.channel.send(client.config.errorMessages.cannot_punish_yourself);
            if (member.roles.highest.position >= message.member.roles.highest.position && message.member !== message.guild.owner) return message.channel.send(client.config.errorMessages.hierarchy);
            if (member.roles.highest.position >= message.guild.me.roles.highest.position) return message.channel.send(client.config.errorMessages.my_hierarchy);
            if (member === message.guild.owner) return message.channel.send(client.config.errorMessages.cannot_punish_owner)
        };

        const punishmentID = client.util.generateRandomBase62String();

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        })
        const { baninfo } = settings;
        const { delModCmds } = settings;
        if (delModCmds) message.delete();

        
        if(member.user) await DMUserInfraction.run(client, 'banned', client.config.colors.punishment[2], message, member, reason, punishmentID, time, baninfo !== 'none' ? baninfo : null);

        ModerationLogger.run(client, 'Banned', message.member, member, message.channel, reason, time, punishmentID);

        await message.guild.members.ban(member, { reason: reason });

        NewInfraction.run(client, 'Ban', message, member, reason, punishmentID, time, false);
        if(time) NewPunishment.run(message.guild.name, message.guild.id, 'ban', member.id, reason, time ? Date.now() + time : 'Never');

        const banEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.punishment[2])
        .setDescription(`${client.config.emotes.success} **${member.user ? member : member.tag}** has been banned with ID \`${punishmentID}\``);

        return message.channel.send(banEmbed);
    }
}