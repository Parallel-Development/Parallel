const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'duration',
    description: 'Convert milliseconds or seconds to a duration format',
    data: new SlashCommandBuilder().setName('duration').setDescription('Convert milliseconds or seconds to a duration format')
    .addNumberOption(option => option.setName('amount').setDescription('The number to convert to a duration format').setRequired(true))
    .addStringOption(option => option.setName('type').setRequired(true).setDescription('Is the amount in seconds or duration format?').addChoice('Milliseconds', 'ms').addChoice('Seconds', 'seconds')),
    async execute(client, interaction, args) {

        const inSeconds = args['type'] === 'seconds';
        const input = inSeconds ? parseFloat(args['amount']) * 1000 : parseFloat(args['amount'])
        if (!input) return client.util.throwError(message, client.config.errors.missing_argument_number);
        if (!input && input !== 0) return client.util.throwError(message, client.config.errors.bad_input_number)
        if (input > 315576000000) return client.util.throwError(message, client.config.errors.time_too_long);
        const duration = client.util.duration(input)

        const durationEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setAuthor('Milliseconds/Seconds to Duration', client.user.displayAvatarURL())
        .addField('Input', `\`\`\`fix\n${inSeconds ? input / 1000 : input }\`\`\``)
        .addField('Output', `\`\`\`js\n${duration}\`\`\``)
        return interaction.reply({ embeds: [durationEmbed] });
    }
}