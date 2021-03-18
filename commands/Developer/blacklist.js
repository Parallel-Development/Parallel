const Discord = require('discord.js')
const config = require('../../config.json')
const moment = require('moment')
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

        const server = client.guilds.cache.get('747624284008218787')
        const member = server.members.cache.get(args[0])
        const role = server.roles.cache.find(r => r.name == 'Blacklisted')

        // Log the blacklist

        const channel = server.channels.cache.get('821901486984265797')
        const blacklistEmbed = new Discord.MessageEmbed()
        .setColor('#ffa500')
        .setAuthor('User Blacklisted', client.user.displayAvatarURL())
        .addField('User ID', args[0], true)
        .addField('Reason', reason, true)
        .addField('Blacklist Manager ID', message.author.id)
        .addField('Date (GMT)', moment(new Date().getTime()).format('dddd, MMMM Do YYYY, h:mm:ss, a'), true)
        channel.send(blacklistEmbed)

        // Add the role "Blacklisted" to the user in the developmental server

        member.roles.add(role).catch(() => { return })
    }
}