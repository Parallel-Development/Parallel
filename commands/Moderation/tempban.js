const Discord = require('discord.js');
const ms = require('ms');
const punishmentSchema = require('../../schemas/punishment-schema');
const warningSchema = require('../../schemas/warning-schema')
const settingsSchema = require('../../schemas/settings-schema');
const moment = require('moment')

module.exports = {
    name: 'tempban',
    description: 'Temporarily bans the specified member from the server',
    permissions: 'BAN_MEMBERS',
    moderationCommand: true,
    usage: 'tempban <member> <time> [reason]',
    aliases: ['tempbanish'],
    deprecated: true,
    async execute(client, message, args) {
        return message.channel.send('Tempban is no longer a command! Specify a duration in the ban command to tempmute. Example: `r!ban (user) {time} [reason]`')
    }
}