const Discord = require('discord.js');
const punishmentSchema = require('../../schemas/punishment-schema');
const settingsSchema = require('../../schemas/settings-schema');

const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const NewInfraction = require('../../structures/NewInfraction');
const NewPunishment = require('../../structures/NewPunishment');

module.exports = {
    name: 'unmute',
    description: 'Unmutes a member allowing them to speak in the server',
    usage: 'unmute [member]\nunmute [member] <reason>',
    permissions: 'MANAGE_ROLES',
    requiredBotPermission: 'MANAGE_ROLES',
    aliases: ['unshut'],
    async execute(client, message, args) {

        if(!args[0]) return message.reply(client.config.errorMessages.missing_arugment_member);

        const reason = args.slice(1).join(' ') || 'Unspecified';
        const punishmentID = client.util.generateRandomBase62String();

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        })
        const { delModCmds } = settings;

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if(!member && await client.users.fetch(args[0]).catch(() => {})) {
            const user = await client.users.fetch(args[0]).catch(() => { })

            let hasMuteRecord = await punishmentSchema.findOne({
                guildID: message.guild.id,
                userID: member.id
            })

            if(!hasMuteRecord) return message.reply('This user is not currently muted');
            if (delModCmds) message.delete();

            NewInfraction.run(client, 'Unmute', message, user, reason, punishmentID, null, false);
            ModerationLogger.run(client, 'Unmuted', message.member, user, message.channel, reason, null, punishmentID);

            await punishmentSchema.deleteMany({
                guildID: message.guild.id,
                userID: user.id,
                type: 'mute'
            })

            return message.reply(`**${user.tag}** has been unmuted. They are not currently on this server`)

        }
        if(!member) return message.reply(client.config.errorMessages.invalid_member);

        if (member.roles.highest.position >= message.member.roles.highest.position && message.member !== message.guild.owner) return message.reply(client.config.errorMessages.hierarchy);

        const role = message.guild.roles.cache.find(r => r.name === 'Muted');
        if(!role) return message.reply('The muted role does not exist');
        if(role.position >= message.guild.me.roles.highest.position) return message.reply(client.config.errorMessages.my_hierarchy);

        let hasMuteRecord = await punishmentSchema.findOne({
            guildID: message.guild.id,
            userID: member.id
        })

        if(!member.roles.cache.has(role.id) && !hasMuteRecord) return message.reply('This user is not currently muted');
        if (delModCmds) message.delete();

        await punishmentSchema.deleteMany({
            guildID: message.guild.id,
            userID: member.id,
            type: 'mute'
        });

        member.roles.remove(role)

        NewInfraction.run(client, 'Unmute', message, member, reason, punishmentID, null, false);
        DMUserInfraction.run(client, 'unmuted', client.config.colors.punishment[1], message, member, reason, 'ignore', 'ignore');
        ModerationLogger.run(client, 'Unmuted', message.member, member, message.channel, reason, null, punishmentID);

        const unmutedEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`${client.config.emotes.success} ${member} has been unmuted`)
        
        return message.reply(unmutedEmbed);
        
    }
}