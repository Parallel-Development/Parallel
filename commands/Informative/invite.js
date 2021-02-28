const Discord = require('discord.js')
const { execute } = require('../Utility/clear')

module.exports = {
    name: 'invite',
    description: 'Sends the invite link of the bot',
    usage: 'invite',
    async execute(client, message, args) {
        const invite = new Discord.MessageEmbed()
            .setColor('09fff2')
            .setDescription('You can invite this amazing bot [here](https://discord.com/api/oauth2/authorize?client_id=745401642664460319&permissions=104320585&scope=bot)')
            .setAuthor('Invite the bot??', client.user.displayAvatarURL())

        message.channel.send(invite)
    }
}
