const Discord = require('discord.js')

module.exports = {
    name: 'invite',
    description: 'Sends the invite link of the bot',
    usage: 'invite\ninvite raw',
    async execute(client, message, args) {

        if (args[0] === 'raw') {
            return message.channel.send('Parallel invite: <https://discord.com/oauth2/authorize?client_id=745401642664460319&scope=bot&permissions=2617568510>\nDiscord server: <https://discord.gg/v2AV3XtnBM>')
        }

        const botInviteLink = new Discord.MessageButton().setLabel('Parallel Bot Invite').setStyle('LINK').setURL('https://discord.com/oauth2/authorize?client_id=745401642664460319&scope=bot&permissions=2617568510');
        const discordInviteLink = new Discord.MessageButton().setLabel('Parallel Development Discord server invite').setStyle('LINK').setURL('https://discord.gg/v2AV3XtnBM');

        const buttons = new Discord.MessageActionRow().addComponents(
            botInviteLink, discordInviteLink
        )

        return message.reply({ content: 'Here you go!', components: [buttons] })
    }
}
