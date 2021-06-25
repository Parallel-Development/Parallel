const Discord = require('discord.js')
const config = require('../../config.json')
const moment = require('moment')

module.exports = {
    name: 'whitelistserver',
    description: 'Whitelists a server from using the bot',
    moderationCommand: true,
    usage: 'blacklistserver <id> [reason]',
    aliases: ['unfuckserver', 'unblacklistserver', 'condomserver', 'nuzzleserver'],
    developer: true,
    async execute(client, message, args) {
        const blacklistSchema = require(`../../schemas/blacklist-schema`)
        const allowed = config.blacklist

        if (!allowed.includes(message.author.id)) return message.channel.send('Sorry, you can\'t run that!')

        if (!args[0]) return message.channel.send('Please specify a server')

        const server = args[0]
        if (!Math.round(server)) return message.channel.send('An ID comes in the shape of a number smh')

        let reason = args.splice(1).join(' ')
        if (!reason) reason = 'Unspecified';

        const result = await blacklistSchema.findOne({
            user: args[0],
            server: true
        })

        if (!result) {
            message.channel.send('This server is not blacklisted')
            return;
        }

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

        await blacklistSchema.deleteOne({
            user: server,
            server: true
        });

        const whitelisted = new Discord.MessageEmbed()
            .setColor('#00ff00')
            .setDescription(`The server ID \`${server}\` has been removed from the blacklist <a:check:800062847974375424>`)

        message.channel.send(whitelisted)

        const server_ = client.guilds.cache.get('747624284008218787')

        // Log the blacklist

        const channel = server_.channels.cache.get('821901486984265797')
        const blacklistEmbed = new Discord.MessageEmbed()
            .setColor('#ffa500')
            .setAuthor('Server Whitelisted', client.user.displayAvatarURL())
            .addField('Server ID', server, true)
            .addField('Reason', reason, true)
            .addField('Blacklist Manager ID', message.author.id)
            .addField('Date (GMT)', moment(new Date().getTime()).format('dddd, MMMM Do YYYY, h:mm:ss, a'), true)
        channel.send(blacklistEmbed)
    }
}
