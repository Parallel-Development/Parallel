const Discord = require('discord.js');
const { i } = require('mathjs');
const config = require('../../config.json')
const moment = require('moment')
const { execute } = require('../Moderation/ban');

module.exports = {
    name: 'whitelist',
    description: 'Unblacklists a user from the bot',
    moderationCommand: true,
    usage: 'whitelist <id>',
    aliases: ['unblacklist'],
    developer: true,
    async execute(client, message, args) {
        const blacklistSchema = require(`../../schemas/blacklist-schema`)

        let allowed = config.blacklist;
        if (!allowed.includes(message.author.id)) return message.channel.send('You are not authorized to execute this command | 401')

        if(!args[0]) return message.channel.send('Please specify an ID to whitelist')
        const id = args[0];

        const result = await blacklistSchema.findOne({
            user: id
        })

        if (!result) {
            message.channel.send('This ID is not blacklisted!')
            return;
        }

        let reason = args[1];
        if(!reason) reason = 'Unspecified'


        await blacklistSchema.deleteOne({
            user: id
        });

        const whitelisted = new Discord.MessageEmbed()
            .setColor('#00ff00')
            .setDescription(`ID \`${id}\` has been removed from the blacklist <a:check:800062847974375424>`)

        message.channel.send(whitelisted)

        const server = client.guilds.cache.get('747624284008218787')
        const member = server.members.cache.get(args[0])
        const role = server.roles.cache.find(r => r.name == 'Blacklisted')

        // Log the whitelist

        const channel = server.channels.cache.get('821901486984265797')
        const whitelistEmbed = new Discord.MessageEmbed()
        .setColor('#ffa500')
        .setAuthor('User Whitelisted', client.user.displayAvatarURL())
        .addField('User ID', args[0], true)
        .addField('Reason', reason, true)
        .addField('Blacklist Manager ID', message.author.id)
        .addField('Date (GMT)', moment(new Date().getTime()).format('dddd, MMMM Do YYYY, h:mm:ss, a'), true)
        channel.send(whitelistEmbed)

        // Removes the role "Blacklisted" from the user in the developmental server

        if (server.members.cache.get(member.id)) member.roles.remove(role).catch(() => { return })
    }
}
    