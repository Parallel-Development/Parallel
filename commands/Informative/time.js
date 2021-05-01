const Discord = require('discord.js')
const moment = require('moment');

module.exports = {
    name: 'time',
    description: 'Get the current time in **GMT**',
    usage: 'time',
    async execute(client, message, args) {
        const time = moment(new Date().getTime() + 3600000 * 4).format('dddd, MMMM Do YYYY, h:mm:ss A ');
        const time24 = moment(new Date().getTime() + 3600000 * 4).format('dddd, MMMM Do YYYY, H:mm:ss');

        const currentTime = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setAuthor('Current Time', client.user.displayAvatarURL())
        .setTitle('All times are in GMT')
        .setDescription(`Time (12 hour format)\n\`\`\`fix\n${time}\`\`\`\nTime (24 hour format)\n\`\`\`fix\n${time24}\`\`\``)

        message.channel.send(currentTime)
    }
}