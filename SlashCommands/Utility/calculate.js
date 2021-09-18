const Discord = require('discord.js')
const math = require('mathjs');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'calculate',
    description: 'Calculate your input',
    data: new SlashCommandBuilder().setName('calculate').setDescription('Calculate your input')
    .addStringOption(option => option.setName('calculation').setDescription('The calculation').setRequired(true)),
    async execute(client, interaction, args) {

        let resp;
        try {
            resp = math.evaluate(args['calculation'].replaceAll('x', '*').replaceAll('÷', ''))
        } catch (err) {
            const errorEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setAuthor('Calculator', client.user.displayAvatarURL())
                .addField('Input', `\`\`\`js\n${args['calculation']}\`\`\``)
                .addField('Output', `\`\`\`Error!\`\`\``)

            return interaction.reply({ embeds: [errorEmbed] })
        }

        if (isNaN(resp)) resp = 'Error!'
        else if (!isFinite(resp)) resp = 'Too large or small to calculate!'

        const answerEmbed = new Discord.MessageEmbed()
            .setColor((typeof resp === 'string' && resp?.endsWith('!')) ? client.config.colors.err : client.config.colors.main)
            .setAuthor('Calculator', client.user.displayAvatarURL())
            .addField('Input', `\`\`\`js\n${args['calculation']}\`\`\``)
            .addField('Output', `\`\`\`js\n${resp}\`\`\``)

        return interaction.reply({ embeds: [answerEmbed] })
    }
}