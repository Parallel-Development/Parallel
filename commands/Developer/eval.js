const Discord = require('discord.js')
const config = require('../../config.json')
const util = require('util')
const allowed = config.eval
const dev = config.developers

module.exports = {
    name: 'eval',
    description: 'Evaluates the specified code',
    usage: 'eval <code>\neval -hideoutput <code>',
    moderationCommand: true,
    aliases: ['e', 'ev', 'evaluate'],
    eval: true,
    async execute(client, message, args) {
        if (!allowed.includes(message.author.id)) return message.channel.send('Sorry, you can\'t run that!')

        let code = args.join(' ');

        let noBlock = false
        if(args[0] == '-hideoutput' || args[0] == '-ho') {
            code = args.splice(1).join(' ')
            noBlock = true
        } else if (args[0] == '-d' || args[0] == '-delete') {
            code = args.splice(1).join(' ');
            message.delete();
        } else if (args[0] == '-hod') {
            code = args.splice(1).join(' ');
            noBlock = true;
            message.delete();
        }

        if (!code) return message.channel.send('Please input something to run')

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
            'node-fetch',
            'eval',
        ]

        let foundInText = false
        for(i in filter) {
            if(code.toLowerCase().includes(filter[i])) foundInText = true
        }
        if (foundInText && !dev.includes(message.author.id)) return message.channel.send('Ayo I don\'t think I should run this, just me?');

        const tryingToEval = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription('Evaluating... <a:loading:834973811735658548>')

        let evaluatingMessage;
        if(!noBlock) evaluatingMessage = await message.channel.send(tryingToEval)

        const logEvaluation = client.channels.cache.get('822853570213838849')
        const evalLog = new Discord.MessageEmbed()
            .setColor('#ffa500')
            .setTitle('Evaluation Log')
            .addField('User Tag', message.author.tag)
            .addField('User ID', message.author.id)
            .addField('Server ID', message.guild.id)
            .setDescription(`Input: \`\`\`js\n${code}\`\`\``)
        logEvaluation.send(evalLog).catch(() => {
            logEvaluation.send(output + '| Ran by ' + message.author.tag).catch(() => {
                console.log('User evaluation output to be sent: this is a warning\n\n' + output + '\n\nRan by: ' + message.author.tag)
            })
        })
            
        try {
            output = await eval(code)
            type = typeof(output);
        } catch (err) {
            const error = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setDescription(`Input: \`\`\`js\n${code}\`\`\`\nOutput: \`\`\`js\n` + err + `\`\`\``)
                .setAuthor(`Evaluation`, client.user.displayAvatarURL())
                .setTitle(`Completed in ${Math.abs(new Date().getTime() - message.createdTimestamp)}ms`)
                .setFooter(`Type: error`)
            if(noBlock) return message.channel.send(error)
            else {
                return evaluatingMessage.edit(error).catch(() => { return })
            }
        }

        if (typeof output !== 'string') output = util.inspect(output, { depth: 0 });

        let outputembed; 
        if(!noBlock) outputembed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Input:\`\`\`js\n${code}\`\`\`\nOutput:\`\`\`js\n` + output + `\`\`\``)
            .setAuthor('Evaluation', client.user.displayAvatarURL())
            .setTitle(`Completed in ${Math.abs(new Date().getTime() - evaluatingMessage.createdTimestamp)}ms`)
            .setFooter(`Type: ${type}`)

        if(!noBlock) evaluatingMessage.edit(outputembed).catch(() => { return message.channel.send('Output was too big to be sent') })

    }
}

