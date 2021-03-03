const Discord = require('discord.js')

module.exports = {
    name: 'cancel',
    description: 'Rawr x3 owo nuzzles pounces on you uwu u so warm',
    usage: 'you just kinda do it',
    aliases: ['twitter'],
    async execute(client, message, args) {
        if(!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send('smh you can\'t cancel anyone')
        function getUserFromMention(mention) {
            if (!mention) return false;
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return mention;
            const id = matches[1];

            return id;
        }
        if(!args[0]) return message.channel.send('yo who u gonna cancel tho??');
        try {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        } catch (err) {
            member = null
        }

        let reason = args.splice(1).join(' ');
        if(!reason) reason = 'no reason like wtf?'

        message.channel.send(`${member} just got cancelled on twitter for ${reason}`)
    }
}