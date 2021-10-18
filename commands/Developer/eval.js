const Discord = require('discord.js')
const util = require('util')

module.exports = {
    name: 'eval',
    description: 'Evaluates the specified code',
    usage: 'eval [code]\n\nFlags: `--silent`, `--delete`, `--async`',
    aliases: ['e', 'ev', 'evaluate', 'execute', 'exec'],
    developer: true,
    async execute(client, message, args) {

        const delMessage = args.includes('--delete');
        const silent = args.includes('--silent');
        const isAsync = args.includes('--async');
        const code = args.join(' ').replace('--delete', '').replace('--silent', '').replace('--async', '').replace('```js', '').replace('```', '').trim();

        let startTime;
        let endTime;

        if (!code) return client.util.throwError(message, 'Please input something to run');
        if (delMessage) message.delete();

        const tryingToEval = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`Evaluating... ${client.config.emotes.loading}`);

        const evaluatingMessage = !silent ? !delMessage ? await message.reply({ embeds: [tryingToEval] }) : await message.channel.send({ embeds: [tryingToEval] }) : null;

        const logEvaluationChannel = client.channels.cache.get('822853570213838849')
        const evalLog = new Discord.MessageEmbed()
            .setColor(client.config.colors.log)
            .setTitle('Evaluation Log')
            .addField('User Tag', message.author.tag)
            .addField('User ID', message.author.id)
            .addField('Server ID', message.guild.id)
            .setDescription(code.length <= 1024 ? `Input: \`\`\`js\n${code}\`\`\`` : await client.util.createBin(code))

        logEvaluationChannel.send({ embeds: [evalLog] });

        try {
            startTime = performance.now();
            output = isAsync ? await eval(`(async() => { ${code} })()`) : await eval(code);
            initialOutput = output;
            endTime = performance.now()
            type = typeof (output);
        } catch (err) {
            const _endTime = performance.now();
            const error = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setDescription(`Input: \`\`\`js\n${code}\`\`\`\nOutput: \`\`\`js\n` + err + `\`\`\``)
                .setAuthor(`Evaluation`, client.user.displayAvatarURL())
                .setTitle(`Error occurred after ${client.util.duration(_endTime - startTime)}`)
                .setFooter(`Returned error type: ${err.name}`)
            if (silent) if (!delMessage) return message.reply({ embeds: [error] }).catch(() => { }); else message.channel.send({ embeds: [error] })
            else return evaluatingMessage.edit({embeds: [error]}).catch(() => { return })
        }

        if (typeof output !== 'string') output = util.inspect(output, { depth: 0 });

        let outputEmbed;
        if (!silent) outputEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`Input:\`\`\`js\n${code}\`\`\`\nOutput:\`\`\`js\n` + output + `\`\`\``)
            .setAuthor('Evaluation', client.user.displayAvatarURL())
            .setTitle(`Completed in ${client.util.duration(endTime - startTime)}`)
            .setFooter(`Return type: ${type}`)

        if (!silent) evaluatingMessage.edit({embeds: [outputEmbed]}).catch(async() => {

            const returned = await client.util.createBin(initialOutput);
            const _output = new Discord.MessageButton().setLabel('Returned output').setStyle('LINK').setURL(returned);

            const buttons = new Discord.MessageActionRow().addComponents(_output)

            const newOutputEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`Failed to send output, click the button below to view the returned output`)
            return evaluatingMessage.edit({embeds: [newOutputEmbed], components: [buttons]});
        }).catch(() => {})

    }
}
