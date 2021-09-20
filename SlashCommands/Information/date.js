const Discord = require('discord.js');
const moment = require('moment');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'date',
    description: 'Get the current date',
    data: new SlashCommandBuilder().setName('date').setDescription('Get the current date'),
    async execute(client, interaction, args) {

        const time = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setAuthor('Date', client.user.displayAvatarURL())
        .addField('Your current date', client.util.timestamp(Date.now()))
        .addField('Date in UTC', moment.utc(Date.now()).format('dddd, MMMM Do YYYY, h:mm:ss A'))
        .addField('24 hour clock version of date in UTC', moment.utc(Date.now()).format('dddd, MMMM Do YYYY, H:mm:ss'))
        .addField('Elapsed milliseconds since January 1st 1970', Date.now().toString() + ' - [why this specific time?](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)')

        return interaction.reply({ embeds: [time] });
    }
}