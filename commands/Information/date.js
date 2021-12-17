const Discord = require('discord.js');

module.exports = {
    name: 'date',
    description: 'Get the current date',
    usage: 'date',
    aliases: ['time'],
    async execute(client, message, args) {
        const time = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(message.guild))
            .setAuthor('Date', client.user.displayAvatarURL())
            .addField('Your current date', client.util.timestamp(Date.now()))
            .addField('Date in UTC', moment.utc(Date.now()).format('dddd, MMMM Do YYYY, h:mm:ss A'))
            .addField(
                '24 hour clock version of date in UTC',
                moment.utc(Date.now()).format('dddd, MMMM Do YYYY, H:mm:ss')
            )
            .addField(
                'Elapsed milliseconds since January 1st 1970',
                Date.now().toString() +
                    ' - [why this specific time?](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)'
            );

        return message.reply({ embeds: [time] });
    }
};
