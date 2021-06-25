const Discord = require('discord.js')
const config = require('../../config.json')
const moment = require('moment')

module.exports = {
    name: 'blacklistserver',
    description: 'Blacklists a server from using the bot',
    moderationCommand: true,
    usage: 'blacklistserver <id> [reason]',
    aliases: ['fuckserver'],
    developer: true,
    async execute(client, message, args) {
        const blacklistSchema = require(`../../schemas/blacklist-schema`)
        const allowed = config.blacklist

        if (!allowed.includes(message.author.id)) return message.channel.send('Sorry, you can\'t run that!')

        if (!args[0]) return message.channel.send('Please specify a server')

        const server = args[0]
        if(!Math.round(server)) return message.channel.send('An ID comes in the shape of a number smh')

        let reason = args.splice(1).join(' ')
        const reasonReq = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription('A reason is required to blacklist a server. Click [here](https://docs.google.com/document/d/15EwKPOPvlIO5iSZj-qQyBjmQ5X7yKHlijW9wCiDfffM/edit?usp=sharing) to see why')
        if (!reason) return message.channel.send(reasonReq)

        const result = await blacklistSchema.findOne({
            user: args[0],
            server: true
        })

        if (result) {
            message.channel.send('This server is already blacklisted!')
            return;
        }

        if (server == '747624284008218787') return message.reply('you can\'t blacklist this server')

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

        await new blacklistSchema({
            user: server,
            reason: reason,
            date: date,
            sent: false,
            server: true
        }).save();

        const blacklisted = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription(`The server ID \`${server}\` has been added to the blacklist <a:check:800062847974375424>`)

        message.channel.send(blacklisted)

        const server_ = client.guilds.cache.get('747624284008218787')

        // Log the blacklist

        const channel = server_.channels.cache.get('821901486984265797')
        const blacklistEmbed = new Discord.MessageEmbed()
            .setColor('#ffa500')
            .setAuthor('Server Blacklisted', client.user.displayAvatarURL())
            .addField('Server ID', server, true)
            .addField('Reason', reason, true)
            .addField('Blacklist Manager ID', message.author.id)
            .addField('Date (GMT)', moment(new Date().getTime()).format('dddd, MMMM Do YYYY, h:mm:ss, a'), true)
        channel.send(blacklistEmbed)
    }
}
