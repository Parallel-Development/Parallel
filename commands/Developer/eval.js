const Discord = require('discord.js')
const util = require('util')

module.exports = {
    name: 'eval',
    description: 'Evaluates the specified code',
    usage: 'eval [code]\neval --silent [code]\neval -delete [code]\neval -sad [code]',
    moderationCommand: true,
    aliases: ['e', 'ev', 'evaluate'],
    developer: true,
    async execute(client, message, args) {

        if (!client.config.developers.includes(message.author.id)) return message.reply('Sorry, you can\'t run that!')

        let code = args.join(' ');
        let silent = false
        if (args[0] === '--silent' || args[0] === '-s') {
            code = args.splice(1).join(' ')
            silent = true
        } else if (args[0] === '-d' || args[0] === '-delete') {
            code = args.splice(1).join(' ');
            message.delete();
        } else if (args[0] === '-sad' || args[0] === '-silentanddelete') {
            code = args.splice(1).join(' ');
            silent = true;
            message.delete();
        }

        if (!code) return message.reply('Please input something to run')

        const tryingToEval = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Evaluating... ${client.config.emotes.loading}`);

        const evaluatingMessage = !silent ? await message.reply({ embeds: [tryingToEval] }) : null;

        const logEvaluationChannel = client.channels.cache.get('822853570213838849')
        const evalLog = new Discord.MessageEmbed()
            .setColor(client.config.colors.log)
            .setTitle('Evaluation Log')
            .addField('User Tag', message.author.tag)
            .addField('User ID', message.author.id)
            .addField('Server ID', message.guild.id)
            .setDescription(code.length <= 1500 ? `Input: \`\`\`js\n${code}\`\`\`` : await client.util.createBin(code))

        logEvaluationChannel.send({embeds: [evalLog]});

        try {
            output = await eval(code)
            type = typeof (output);
        } catch (err) {
            const error = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setDescription(`Input: \`\`\`js\n${code}\`\`\`\nOutput: \`\`\`js\n` + err + `\`\`\``)
                .setAuthor(`Evaluation`, client.user.displayAvatarURL())
                .setTitle(`Completed in ${Date.now() - message.createdTimestamp}ms`)
                .setFooter(`Type: error`)
            if (silent) return message.reply(error)
            else return evaluatingMessage.edit({embeds: [error]}).catch(() => { return })
        }

        if (typeof output !== 'string') output = util.inspect(output, { depth: 0 });

        let outputEmbed;
        if (!silent) outputEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`Input:\`\`\`js\n${code}\`\`\`\nOutput:\`\`\`js\n` + output + `\`\`\``)
            .setAuthor('Evaluation', client.user.displayAvatarURL())
            .setTitle(`Completed in ${Date.now() - message.createdTimestamp}ms`)
            .setFooter(`Type: ${type}`)

        if (!silent) evaluatingMessage.edit({embeds: [outputEmbed]}).catch(async() => {
            const newOutputEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`Failed to send output, click [here](${await client.util.createBin(output, true)}) to see the output`)
            return evaluatingMessage.edit({embeds: [newOutputEmbed]});
        })

    }
}
