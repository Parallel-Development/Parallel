const Discord = require('discord.js')

module.exports = {
    name: 'invite',
    description: 'Sends the invite link of the bot',
    usage: 'invite',
    async execute(client, message, args) {
        const invite = new Discord.MessageEmbed()
            .setColor('09fff2')
            .setDescription('You can invite Parallel now to your Discord server [here](https://discord.com/api/oauth2/authorize?client_id=745401642664460319&permissions=104320585&scope=bot)\n\nYou can join the Parallel Development Discord server [here](https://discord.gg/DcmVMPx8bn)')
            .setAuthor('Invites', client.user.displayAvatarURL())

        message.channel.send(invite)
    }
}
