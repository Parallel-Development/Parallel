const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');
const punishmentSchema = require('../../schemas/punishment-schema');
const settingsSchema = require('../../schemas/settings-schema');
const ms = require('ms');

module.exports = {
    name: 'duration',
    description: 'Change the duration of a punishment',
    usage: 'duration [punishment ID] (new duration)',
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    async execute(client, message, args) {

        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
        const { modRoles } = guildSettings;
        const isModerator = message.member.roles.cache.some(role => modRoles.includes(role.id));

        const punishmentID = args[0];
        const newDuration = args[1];
        if (!punishmentID) return client.util.throwError(message, client.config.errors.missing_argument_punishmentID);

        const punishmentInformation = await warningSchema.findOne({ 
            guildID: message.guild.id, 
            warnings: 
            { $elemMatch: { 
                punishmentID: punishmentID 
            }} 
        })

        if (!punishmentInformation) return client.util.throwError(message, client.config.errors.invalid_punishmentID);

        const punishment = punishmentInformation.warnings.find(key => key.punishmentID === punishmentID);
        if (punishment.type !== 'Mute' && punishment.type !== 'Ban' && punishment.type !== 'Warn') return client.util.throwError(message, `can only edit punishment durations with punishment type \`warn\`, \`mute\`, or \`ban\``);
        if (punishment.type === 'Mute' && !message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_ROLES) && !isModerator) return client.util.throwError(message, `you need the \`Manage Roles\` permission or a moderator role to edit this punishment duration`);
        if (punishment.type === 'Ban' && !message.member.permissions.has(Discord.Permissions.FLAGS.BAN_MEMBERS) && !isModerator) return client.util.throwError(message, `you need the \`Ban Members\` permission or a moderator role to edit this punishment duration`);

        if (punishment.expires - Date.now() <= 0) return client.util.throwError(message, 'this punishment has already expired');
        if (!ms(newDuration)) return client.util.throwError(message, client.config.errors.bad_duration);
        if (ms(newDuration) > 315576000000) return client.util.throwError(message, client.config.errors.time_too_long);

        await warningSchema.updateOne({
                guildID: message.guild.id,
                warnings: {
                    $elemMatch: {
                        punishmentID: punishmentID
                    }
                }
            },
            {
                $set: {
                    "warnings.$.expires": Date.now() + ms(newDuration),
                    "warnings.$.duration": client.util.duration(`${ms(newDuration)}`)
                }
            })
        
        if (punishment.type !== 'Warn') {
            await punishmentSchema.updateOne({
                guildID: message.guild.id,
                type: punishment.type[0].toLowerCase() + punishment.type.slice(1),
                userID: punishment.userID
            },
            {
                expires: Date.now() + ms(newDuration)
            })
        }

        return message.reply(`Successfully updated duration for punishment \`${punishmentID}\` to \`${client.util.duration(ms(newDuration))}\``)
    }
}