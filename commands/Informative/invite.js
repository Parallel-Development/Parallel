const Discord = require('discord.js')

module.exports = {
    name: 'invite',
    description: 'Sends the invite link of the bot',
    usage: 'invite',
    async execute(client, message, args) {
        const invite = new Discord.MessageEmbed()
            .setColor('09fff2')
            .setDescription('You can invite Razor now to your Discord server [here](https://discord.com/api/oauth2/authorize?client_id=745401642664460319&permissions=104320585&scope=bot)\n\nYou can join the Razor Development Discord server [here](https://discord.gg/2wwkAUsrbD)')
            .setAuthor('Invites', client.user.displayAvatarURL())

        message.channel.send(invite)
    }
}
