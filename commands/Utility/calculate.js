const Discord = require('discord.js')
const math = require('mathjs')

module.exports = {
    name: 'calculate',
    description: 'Calculate your input | All calculations are done by the common NPM package `mathjs`',
    usage: 'calculate <calculation>',
    aliases: ['calc'],
    async execute(client, message, args) {
        if (!args[0]) return message.reply('Please input a calculation')

        let resp;
        try {
            resp = math.evaluate(args.join(' '))
        } catch (err) {
            const errorEmbed = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .addField('Input', `\`\`\`js\n${args.join(' ')}\`\`\``)
                .addField('Output', `\`\`\`Error\`\`\``)

            return message.reply(errorEmbed)
        }

        const answerEmbed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .addField('Input', `\`\`\`js\n${args.join(' ')}\`\`\``)
            .addField('Output', `\`\`\`js\n${resp}\`\`\``)

        return message.reply({ embeds: [answerEmbed] })
    }
}
