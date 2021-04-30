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
    async execute(client, message, args, blockEval) {
        if (!allowed.includes(message.author.id)) return message.channel.send('You are not authorized to execute this command | 401')

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

        if(args[0] == '-nb' || args[0] == '-noblock') {
            code = args.splice(1).join(' ');
            noBlock = true
            message.author.send('The flags `-nb` and `-noblock` are deprecated, please use the new flags `-ho` and `-hideoutput` | Support for `-nb` and `-noblock` will be dropped soon').catch(() => {
                message.channel.send('The flags `-nb` and `-noblock` are deprecated, please use the new flags `-ho` and `-hideoutput` | Support for `-nb` and `-noblock` will be dropped soon')
            })
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
        if(noBlock) msg.delete()
            
        try {
            output = await eval(code)
            if(output.length >= 1024) {
                if(!noBlock) {
                    const tooBigOutput = new Discord.MessageEmbed()
                    .setColor('#FF0000')
                    .setDescription(`Output was too big to be sent, evaluation cancelled (${output.length} characters)`)
                    return msg.edit(tooBigOutput).catch(() =>{ return })
                }
            }
        } catch (err) {
            const error = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setDescription(`Input: \`\`\`js\n${code}\`\`\`\nOutput: \`\`\`js\n${err}\`\`\``)
                .setAuthor(`Evaluation`, client.user.displayAvatarURL())
                .setTitle(`Completed in ${Math.abs(new Date().getTime() - msg.createdTimestamp)}ms`)
                .setFooter(`Type: error`)
            if(noBlock) return message.channel.send(error)
            else {
                return msg.edit(error).catch(() => { return })
            }
        }

        const outputembed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Input:\`\`\`js\n${code}\`\`\`\nOutput:\`\`\`\n${output}\`\`\``)
            .setAuthor('Evaluation', client.user.displayAvatarURL())
            .setTitle(`Completed in ${Math.abs(new Date().getTime() - msg.createdTimestamp)}ms`)
            .setFooter(`Type: ${typeof output}`)

        if (typeof output != 'string') output = util.inspect(output);

        if(!noBlock) msg.edit(outputembed).catch(() => { return })

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

