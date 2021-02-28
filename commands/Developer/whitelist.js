const Discord = require('discord.js');
const { execute } = require('../Moderation/ban');

module.exports = {
    name: 'whitelist',
    description: 'Unblacklists a user from the bot',
    usage: 'whitelist <id>',
    aliases: ['unblacklist'],
    async execute(client, message, args) {
        const blacklistSchema = require(`../../schemas/blacklist-schema`)

        if (message.author.id != '633776442366361601') return message.react('🔒')

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
    