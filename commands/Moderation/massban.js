const Discord = require('discord.js');
const serverCooldown = new Set();

module.exports = {
    name: 'massban',
    description: 'Ban up to 15 users at the same time',
    usage: 'massban <users>',
    permissions: 'BAN_MEMBERS',
    moderationCommand: true,
    async execute(client, message, args) {
        if(serverCooldown.has(message.guild.id)) return message.channel.send('This server is on cooldown')
        else {
            serverCooldown.add(message.guild.id)
            setTimeout(() => {
                serverCooldown.delete(message.guild.id)
            }, 30000)
        }
        const users = message.mentions.users;
        if(users.size == 0) return message.channel.send('Please mention at least 1 user to ban!')
        if(users.size > 15) return message.channel.send('The max amount of users you can massban is 15')

        let reason;
        let duration;
        let count = 0;
        
        const msg = await message.channel.send('For what reason?')
        let filter = m => m.author.id == message.author.id
        const collector = new Discord.MessageCollector(message.channel, filter, { time: 120000 })
        collector.on('collect', async(message) => {
            message.delete();
            await msg.edit('For what duration? \'permanent\' to make it permanent')
        })

        await users.forEach(user => {
            if(user.roles.highest.position >= message.member.roles.highest.position) return message.channel.send(`You cannot ban ${user} as their highest role is higher or equal to yours in hierarchy`)
            if(user.hasPermission('ADMINISTRATOR')) return message.channel.send(`You cannot ban ${user} as they are an adninistrator`)
        })
    }
}