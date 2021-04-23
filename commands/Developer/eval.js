const Discord = require('discord.js')
const config = require('../../config.json')
const util = require('util')
const allowed = config.eval
const dev = config.developers

module.exports = {
    name: 'eval',
    description: 'Evaluates the specified code',
    usage: 'eval <code>\neval -noblock <code>',
    moderationCommand: true,
    aliases: ['e', 'ev', 'evaluate'],
    async execute(client, message, args) {
        if (!allowed.includes(message.author.id)) return message.react('🍭').catch(() => { return })

        let code = args.join(' ');
        if (!code) return message.channel.send('Please input something to run')

        let noBlock = false
        if(args[0] == '-noblock' || args[0] == '-nb') {
            code = args.splice(1).join(' ')
            noBlock = true
        }

        let output;

        // Filter
        const filter = [
            'replace',
            'token',
            'config',
            'process',
            'fs.unlink',
            'buffer',
            'tostring',
            'schema',
            'console',
            'throw',
            'node-fetch'
        ]

        let foundInText = false
        for(i in filter) {
            if(code.toLowerCase().includes(filter[i])) foundInText = true
        }
        if (foundInText && !dev.includes(message.author.id)) return message.channel.send('Error: refused to execute this command because it may be potentially abusive. If you think this is an error, contact a developer')

        const tryingToEval = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription('Evaluating... <a:loading:834973811735658548>')

        const msg = await message.channel.send(tryingToEval)

        try {
            output = await eval(code)
            if(output.length >= 1024) {
                if(!noBlock) {
                    const tooBigOutput = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setDescription(`Output was too big to be sent (${output.length} characters)`)
                    return msg.edit(`Output too big to be sent | You can use the -noblock flag to send no output`)
                }
            }
        } catch (err) {
            const error = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setDescription(`Input: \`\`\`js\n${code}\`\`\`\nOutput: \`\`\`js\n${err}\`\`\``)
                .setAuthor(`Evaluation`, client.user.displayAvatarURL())
                .setTitle(`Completed in ${Math.abs(new Date().getTime() - msg.createdTimestamp)}ms`)
                .setFooter(`Type: error`)
            return msg.edit(error);
        }

        const outputembed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Input:\`\`\`js\n${code}\`\`\`\nOutput:\`\`\`\n${output}\`\`\``)
            .setAuthor('Evaluation', client.user.displayAvatarURL())
            .setTitle(`Completed in ${Math.abs(new Date().getTime() - msg.createdTimestamp)}ms`)
            .setFooter(`Type: ${typeof output}`)

        if (typeof output != 'string') output = util.inspect(output);

        if(!noBlock) msg.edit(outputembed);

        const server = client.guilds.cache.get('747624284008218787')
        const channel = server.channels.cache.get('822853570213838849')
        const evalLog = new Discord.MessageEmbed()
        .setColor('#ffa500')
        .setTitle('Evaluation Log')
        .addField('User Tag', message.author.tag)
        .addField('User ID', message.author.id)
        .setDescription(`Input: \`\`\`js\n${code}\`\`\``)
        channel.send(evalLog)
    }
}

