const Discord = require('discord.js');
const { i } = require('mathjs');
const config = require('../../config.json')
const { execute } = require('../Moderation/ban');

module.exports = {
    name: 'whitelist',
    description: 'Unblacklists a user from the bot',
    usage: 'whitelist <id>',
    aliases: ['unblacklist'],
    async execute(client, message, args) {
        const blacklistSchema = require(`../../schemas/blacklist-schema`)

        let allowed = config.developers;
        if(!allowed.includes(message.author.id)) return message.react('🔒')

        const id = args[0];

        const result = await blacklistSchema.findOne({
            user: id
        })

        if (!result) {
            message.channel.send('This ID is not blacklisted!')
            return;
        }


        await blacklistSchema.deleteOne({
            user: id
        });

        const whitelisted = new Discord.MessageEmbed()
            .setColor('#00ff00')
            .setDescription(`ID \`${id}\` has been removed from the blacklist <a:check:800062847974375424>`)

        message.channel.send(whitelisted)
    }
}
    