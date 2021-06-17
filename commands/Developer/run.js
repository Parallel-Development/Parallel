const Discord = require('discord.js')
const util = require('util')
const config = require('../../config.json')
const settingsSchema = require('../../schemas/settings-schema')
const { execute } = require('../Moderation/ban')
const allowed = config.eval
const dev = config.developers

module.exports = {
    name: 'run',
    description: 'Opens an evaluation session that evaluates all your messages',
    moderationCommand: true,
    usage: 'run',
    aliases: ['session'],
    eval: true,
    async execute(client, message, args) {

        if (!allowed.includes(message.author.id)) return message.channel.send('Sorry, you can\'t run that!')

        const prefixSetting = await settingsSchema.findOne({
            guildid: message.guild.id
        })

        const logEvaluation = client.channels.cache.get('822853570213838849')

        let count = 0;

        const sessionstarted = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`A new session has been opened for **${message.author.tag}**\n\nYou can end this session by typing \`.exit\`, and can make the bot ignore a message by putting an exclamation mark before your message`)

        message.channel.send(sessionstarted)
        let filter = m => m.author.id === message.author.id
        let collector = new Discord.MessageCollector(message.channel, filter, { time: 1800000 })
        collector.on('collect', (message, col) => {
            if (message.content.startsWith('.exit')) {
                collector.stop();
                message.channel.send(`Session ended for **${message.author.tag}**!`)
                return;
            }

            const { prefix } = prefixSetting
            if (message.content.startsWith(`${prefix}run`) || message.content.startsWith(`${prefix}session`)) {
                message.channel.send(`The old session for **${message.author.username}**, because a new one has been created!`);
                collector.stop();
                return;
            }

            if (message.content.startsWith('!')) return;

            count++
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
            for (i in filter) {
                if (message.content.toLowerCase().includes(filter[i])) foundInText = true
            }
            if (foundInText && !dev.includes(message.author.id)) return message.channel.send('Error: refused to execute this command because it may be potentially abusive. If you think this is an error, contact a developer')

            try {
                output = eval(message.content)
                const outputEmbed = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setDescription(`Input: \`\`\`js\n${message.content}\`\`\`\nOutput: \`\`\`js\n${output}\`\`\``)
                    .setAuthor(`Evaluation (Session - ${count})`, client.user.displayAvatarURL())
                    .setFooter(`Type: ${typeof output}`)
                message.channel.send(outputEmbed)
            } catch (err) {
                const error = new Discord.MessageEmbed()
                    .setColor('#FF0000')
                    .setDescription(`Input: \`\`\`js\n${message.content}\`\`\`\nOutput: \`\`\`js\n${err}\`\`\``)
                    .setAuthor(`Evaluation (Session - ${count})`, client.user.displayAvatarURL())
                    .setFooter(`Type: error`)
                return message.channel.send(error)
            }

            var evalLog = new Discord.MessageEmbed()
            .setColor('#ffa500')
            .setTitle('Evaluation Log')
            .addField('User Tag', message.author.tag)
            .addField('User ID', message.author.id)
            .setDescription(`Input: \`\`\`js\n${message.content}\`\`\``)
            .setFooter('This was ran inside a session')
            logEvaluation.send(evalLog)


        })

        collector.on('end', () => {
            return;
        })
    }
}

