const ms = require('ms');
const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const Infraction = require('../../structures/Infraction');
const Punishment = require('../../structures/Punishment');

module.exports = {
    name: 'ban',
    description: 'Bans a member from the server',
    usage: 'ban [member]\nban [member] <reason>\nban [member] <duration>\nban [member] <duration> (reason)',
    aliases: ['gtfo', 'banish', 'b'],
    permissions: Discord.Permissions.FLAGS.BAN_MEMBERS,
    requiredBotPermission: Discord.Permissions.FLAGS.BAN_MEMBERS,
    async execute(client, message, args) {

        if (!args[0]) return await client.util.throwError(message, client.config.errors.missing_argument_member);

        const member = await client.util.getMember(message.guild, args[0]) || await client.util.getUser(client, args[0]);
        if (!member) return await client.util.throwError(message, client.config.errors.invalid_member);

        const alreadyBanned = await message.guild.bans.fetch().then(bans => bans.find(ban => ban.user.id === member.id));
        if (alreadyBanned) return await client.util.throwError(message, 'This user is already banned')

        const __time = args[1];
        const time = parseInt(__time) && __time !== '' ? ms(__time) : null
        if (time && time > 315576000000) return await client.util.throwError(message, client.config.errors.time_too_long);
        const reason = time ? args.slice(2).join(' ') || 'Unspecified' : args.slice(1).join(' ') || 'Unspecified'

        if (member.user) {
            if (member.id === client.user.id) return await client.util.throwError(message, client.config.errors.cannot_punish_myself);
            if (member.id === message.member.id) return await client.util.throwError(message, client.config.errors.cannot_punish_yourself);
            if (member.roles.highest.position >= message.member.roles.highest.position && message.member.id !== message.guild.ownerId) return await client.util.throwError(message, client.config.errors.hierarchy);
            if (member.roles.highest.position >= message.guild.me.roles.highest.position) return await client.util.throwError(message, client.config.errors.my_hierarchy);
            if (member.id === message.guild.ownerId) return await client.util.throwError(message, client.config.errors.cannot_punish_owner)
        };

        const punishmentID = client.util.generateID();

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        })
        const { baninfo } = settings;
        const { delModCmds } = settings;
        if (delModCmds) message.delete();

        
        if (member.user) await new DMUserInfraction(client, 'banned', client.config.colors.punishment[2], message, member, { reason: reason, punishmentID: punishmentID, time: time, baninfo: baninfo !== 'none' ? baninfo : null });

        new ModerationLogger(client, 'Banned', message.member, member, message.channel, { reason: reason, duration: time, punishmentID: punishmentID});

        await message.guild.members.ban(member, { reason: reason });

        new Infraction(client, 'Ban', message, message.member, member, { reason: reason, punishmentID: punishmentID, time: time, auto: false });
        if (time) new Punishment(message.guild.name, message.guild.id, 'ban', member.id, { reason: reason, time: time ? Date.now() + time : 'Never' });

        const banEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.punishment[2])
        .setDescription(`${client.config.emotes.success} **${member.user ? member : member.tag}** has been banned with ID \`${punishmentID}\``);

        return message.channel.send({ embeds: [banEmbed] });
    }
}