const Discord = require('discord.js')
const math = require('mathjs')

module.exports = {
    name: 'calculate',
    description: 'Calculate your input',
    usage: 'calculate <calculation>',
    aliases: ['calc'],
    async execute(client, message, args) {
        if (!args[0]) return await client.util.throwError(message, 'Please input a calculation')

        let resp;
        try {
            resp = math.evaluate(args.join(' ').replaceAll('x', '*').replaceAll('÷', ''))
        } catch (err) {
            const errorEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setAuthor('Calculator', client.user.displayAvatarURL())
                .addField('Input', `\`\`\`js\n${args.join(' ')}\`\`\``)
                .addField('Output', `\`\`\`Error!\`\`\``)

            return message.reply({ embeds: [errorEmbed] })
        }

        if (isNaN(resp)) resp = 'Error!'
        else if (!isFinite(resp)) resp = 'Too large or small to calculate!'

        const answerEmbed = new Discord.MessageEmbed()
            .setColor((typeof resp === 'string' && resp?.endsWith('!')) ? client.config.colors.err : client.config.colors.main)
            .setAuthor('Calculator', client.user.displayAvatarURL())
            .addField('Input', `\`\`\`js\n${args.join(' ')}\`\`\``)
            .addField('Output', `\`\`\`js\n${resp}\`\`\``)

        return message.reply({ embeds: [answerEmbed] })
    }
}
