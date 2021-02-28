const Discord = require('discord.js')
const util = require('util')
const allowed = ['633776442366361601', '483375587176480768']

module.exports = {
    name: 'eval',
    description: 'Evaluates the specified code',
    usage: 'eval <code>',
    aliases: ['e', 'ev', 'evaluate'],
    async execute(client, message, args) {
        if (!allowed.includes(message.author.id)) return message.react('🔒')

        let code = args.join(' ');
        if (!code) return message.channel.send('Please input something to run')

        let output;

        try {
            output = await eval(code)
        } catch (err) {
            const error = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setDescription(`Input: \`\`\`js\n${code}\`\`\`\nOutput: \`\`\`js\n${err}\`\`\``)
                .setAuthor(`Evaluation`, client.user.displayAvatarURL())
                .setFooter(`Type: error`)
            return message.channel.send(error);
        }

        const outputembed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Input:\`\`\`js\n${code}\`\`\`\nOutput:\`\`\`\n${output}\`\`\``)
            .setAuthor('Evaluation', client.user.displayAvatarURL())
            .setFooter(`Type: ${typeof output}`)

        if (typeof output != 'string') output = util.inspect(output);

        message.channel.send(outputembed);
    }
}

