const Discord = require('discord.js');
const { execute } = require('../Moderation/mute');

module.exports = {
    name: 'yesorno',
    description: 'Randomly chooses betweent the words `Yes` and `No`',
    usage: `yesorno`,
    aliases: ['yon'],
    async execute(client, message, args) {
        const answer = ['No', 'Yes']

        const result = answer[Math.floor(Math.random() * answer.length)];

        const resultEmbed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`My answer... is ${result}!`)
            .setAuthor('Yes or No??', client.user.displayAvatarURL())

        message.channel.send(resultEmbed)
    }
}


