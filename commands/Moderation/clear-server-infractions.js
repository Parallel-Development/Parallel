const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');
const punishmentSchema = require('../../schemas/punishment-schema')
const restricted = new Set();

module.exports = {
    name: 'clear-server-infractions',
    description: 'Remove all server infractions',
    usage: 'clear-server-infractions',
    aliases: ['clear-server-warns', 'clear-server-warnings', 'clear-all-warnings'],
    permissions: Discord.Permissions.FLAGS.ADMINISTRATOR,
    async execute(client, message, args) {

        if (restricted.has(message.guild.id)) return;

        const guildWarnings = await warningSchema.findOne({ 
            guildID: message.guild.id
        })

        if (!guildWarnings || !guildWarnings.warnings.length) return message.reply('This server has no warnings')

        if (global.confirmationRequests.some(request => request.ID === message.author.id)) global.confirmationRequests.pop({ ID: message.author.id })
        global.confirmationRequests.push({ ID: message.author.id, guildID: message.guild.id, request: 'clearServerInfractions', at: Date.now() });
        message.reply('Are you sure? This will remove all warnings from the server and there is no way to get them back. To confirm, run `confirm`. To cancel, run `cancel`');
    }
}
