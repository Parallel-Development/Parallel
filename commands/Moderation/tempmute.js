const Discord = require('discord.js')
const moment = require('moment')
const ms = require('ms')
const punishmentSchema = require('../../schemas/punishment-schema')
const warningSchema = require('../../schemas/warning-schema')

module.exports = {
    name: 'tempmute',
    description: 'Temporarily mutes the specified member in the server',
    moderationCommand: true,
    usage: 'tempmute <member> [time] (reason)',
    deprecated: true,
    async execute(client, message, args) {
        message.channel.send('Tempmute is no longer a command! Specify a duration in the mute command to tempmute. Example: `>mute (user) {time} [reason]`')
    }

} 