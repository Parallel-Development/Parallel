const Discord = require('discord.js')
const util = require('util')
const config = require('../../config.json')
const settingsSchema = require('../../schemas/settings-schema')
const { execute } = require('../Moderation/ban')
const allowed = config.eval

module.exports = {
    name: 'run',
    description: 'Opens an evaluation session that evaluates all your messages',
    usage: 'run',
    aliases: ['session'],
    async execute(client, message, args) {
        const prefixSetting = await settingsSchema.findOne({
            guildid: message.guild.id
        })

        let count = 0;

        const sessionstarted = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`A new session has been opened for **${message.author.username}**\n\nYou can end this session by typing \`.end\`, and can make the bot ignore a message by running \`.i [msg]\``)

        if (!allowed.includes(message.author.id)) return;
        message.channel.send(sessionstarted)
        let filter = m => m.author.id === message.author.id
        let collector = new Discord.MessageCollector(message.channel, filter, { time: 300000 })
        collector.on('collect', (message, col) => {
            if (message.content.startsWith('.end')) {
                collector.stop();
                message.channel.send(`Session ended for **${message.author.username}**!`)
                return;
            }

            const { prefix } = prefixSetting
            if (message.content.startsWith(`${prefix}run`) || message.content.startsWith(`${prefix}session`)) {
                message.channel.send(`The old session for **${message.author.username}**, because a new one has been created!`);
                collector.stop();
                return;
            }

            if (message.content.startsWith('.i')) return;

            count++
            let output;

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


        })

        collector.on('end', () => {
            return;
        })
    }
}

