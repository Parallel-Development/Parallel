const Discord = require('discord.js')
const config = require('../../config.json')
const moment = require('moment')

module.exports = {
    name: 'blacklist',
    description: 'Blacklists a user from using the bot',
    moderationCommand: true,
    usage: 'blacklist <id> [reason]',
    aliases: ['fuck'],
    developer: true,
    async execute(client, message, args) {
        const blacklistSchema = require(`../../schemas/blacklist-schema`)
        const allowed = config.blacklist

        if (!allowed.includes(message.author.id)) return message.channel.send('Sorry, you can\'t run that!')

        if(!args[0]) return message.channel.send('Please specify a member')

        function getUserFromMention(mention) {
            if (!mention) return false;
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return mention;
            const id = matches[1];

            return id;
        }

        var member;

        try {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        } catch (err) {
            member = null
        }

        if (!member) {
            try {
                member = await client.users.fetch(args[0])
            } catch {
                return message.channel.send('No such user exists')
            }
        }

        let reason = args.splice(1).join(' ')
        const reasonReq = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription('A reason is required to blacklist a user. Click [here](https://docs.google.com/document/d/15EwKPOPvlIO5iSZj-qQyBjmQ5X7yKHlijW9wCiDfffM/edit?usp=sharing) to see why')
        if (!reason) return message.channel.send(reasonReq)

        const result = await blacklistSchema.findOne({
            user: args[0],
            server: false
        })

        if (result) {
            message.channel.send('This user is already blacklisted!')
            return;
        }

        if (member.id == '633776442366361601') return message.reply('you can\'t blacklist this user')
        if(member.id == message.author.id) return message.channel.send('Soon :)')
            
        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

        await new blacklistSchema({
            user: member.id,
            reason: reason,
            date: date,
            sent: false,
            server: false
        }).save();

        const blacklisted = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription(`The user ID \`${member.id}\` has been added to the blacklist <a:check:800062847974375424>`)

        message.channel.send(blacklisted)

        const server = client.guilds.cache.get('747624284008218787')
        const role = server.roles.cache.find(r => r.name == 'Blacklisted')

        // Log the blacklist

        const channel = server.channels.cache.get('821901486984265797')
        const blacklistEmbed = new Discord.MessageEmbed()
        .setColor('#ffa500')
        .setAuthor('User Blacklisted', client.user.displayAvatarURL())
        .addField('User ID', member.id, true)
        .addField('Reason', reason, true)
        .addField('Blacklist Manager ID', message.author.id)
        .addField('Date (GMT)', moment(new Date().getTime()).format('dddd, MMMM Do YYYY, h:mm:ss, a'), true)
        channel.send(blacklistEmbed)

        // Add the role "Blacklisted" to the user in the developmental server

        if(server.members.cache.get(member.id)) member.roles.add(role).catch(() => { return })
    }
}
