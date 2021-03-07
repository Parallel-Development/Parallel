const Discord = require('discord.js')
const config = require('../../config.json')
const { execute } = require('../Moderation/ban')

module.exports = {
    name: 'blacklist',
    description: 'Blacklists a user from using the bot',
    usage: 'blacklist <id> [reason]',
    aliases: ['fuck'],
    async execute(client, message, args) {
        const blacklistSchema = require(`../../schemas/blacklist-schema`)
        const allowed = config.developers

        if (!allowed.includes(message.author.id)) return;

        if (!args[0]) return message.channel.send('Please specify an ID!')
        if (isNaN(args[0])) return message.channel.send('Blacklist is ID based. Please input an ID only')

        let reason = args.splice(1).join(' ')
        const reasonReq = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription('A reason is required to blacklist a user. Click [here](https://docs.google.com/document/d/15EwKPOPvlIO5iSZj-qQyBjmQ5X7yKHlijW9wCiDfffM/edit?usp=sharing) to see why')
        if (!reason) return message.channel.send(reasonReq)

        const result = await blacklistSchema.findOne({
            user: args[0]
        })

        if (result) {
            message.channel.send('This user is already blacklisted!')
            return;
        }

        if (args[0] == '633776442366361601') return message.reply('you can\'t blacklist this user')

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

        await new blacklistSchema({
            user: args[0],
            reason: reason,
            date: date,
            sent: 'false'
        }).save();

        const blacklisted = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription(`The ID \`${args[0]}\` has been added to the blacklist <a:check:800062847974375424>`)

        message.channel.send(blacklisted)
    }
}