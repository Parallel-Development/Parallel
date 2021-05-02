const Discord = require('discord.js')
const { execute } = require('./settings')
const settingsSchema = require('../../schemas/settings-schema')
module.exports = {
    name: 'prefix',
    description: 'Change the bot prefix in your server',
    permissions: 'MANAGE_GUILD',
    moderationCommand: true,
    usage: 'prefix (prefix)',
    async execute(client, message, args) {

        if (!args[0]) return message.channel.send('Please specify a prefix')

        await settingsSchema.updateOne({
            guildid: message.guild.id
        }, {
            prefix: args[0]
        })
        message.channel.send(`The server prefix for razor is now \`${args[0]}\`. You can ping me for the prefix if you ever forget`)
    }
}