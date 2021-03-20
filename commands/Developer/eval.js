const Discord = require('discord.js')
const config = require('../../config.json')
const util = require('util')
const allowed = config.eval
const dev = config.developers

module.exports = {
    name: 'eval',
    description: 'Evaluates the specified code',
    usage: 'eval <code>',
    aliases: ['e', 'ev', 'evaluate'],
    async execute(client, message, args) {
        if (!allowed.includes(message.author.id)) return;

        let code = args.join(' ');
        if (!code) return message.channel.send('Please input something to run')

        let output;

        // Filter
        const filter = [
            'replace',
            'client.token',
            'config',
            'process',
            'fs.unlink',
            'buffer',
            'tostring',
            'schema',
            'console',
        ]

        let foundInText = false
        for(i of filter) {
            if(code.toLowerCase().includes(filter[i])) foundInText = true
        }
        if(foundInText && !dev.includes(message.author.id)) return message.channel.send('Error: refused to execute this command because it may be potentially abusive. If you think this is an error, contact a developer')

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

