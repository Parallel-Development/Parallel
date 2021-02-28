const Discord = require('discord.js')
const math = require('mathjs')

module.exports = {
    name: 'calc',
    descrption: 'Calculate your passed arguments',
    usage: 'calc <calculation>',
    aliases: ['calculate'],
    async execute(client, message, args) {
        if (!args[0]) return message.channel.send('Please input a calculation')

        let resp;
        try {
            resp = math.evaluate(args.join(' '))
        } catch (err) {
            const errorEmbed = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .addField('Input', `\`\`\`js\n${args.join(' ')}\`\`\``)
                .addField('Output', `\`\`\`Error\`\`\``)

            message.channel.send(errorEmbed)
            return;
        }

        const answerEmbed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .addField('Input', `\`\`\`js\n${args.join(' ')}\`\`\``)
            .addField('Output', `\`\`\`js\n${resp}\`\`\``)

        message.channel.send(answerEmbed)
    }
}


