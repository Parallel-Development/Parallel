const Discord = require('discord.js')

module.exports = {
    name: 'encrypt',
    description: 'Encryptes text into base64, or binary (utf8)',
    aliases: ['encode'],
    usage: 'encrypt <type: base64, binary>',
    async execute(client, message, args) {
        const missingargtype = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('Please specify a type: \`base64\` or \`binary\`')
        .setAuthor('Error', client.user.displayAvatarURL())

        const invalidtype = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('This is an invalid type! Please specify a valid type: \`base64\` or \`binary\`')
        .setAuthor('Error', client.user.displayAvatarURL())

        const notext = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('Please input text to encrypt!')
        .setAuthor('Error', client.user.displayAvatarURL())


        const type = args[0]
        if(!type) return message.channel.send(missingargtype)

        const text = args.splice(1).join(' ')
        const toolarge = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription(`This input is too large! Please keep it at a max of 500 characters (You attempted to encrypt \`${text.length}\` characters`)
        .setAuthor('Error', client.user.displayAvatarURL())
        if(!text) return message.channel.send(notext)
        if(text.length > 500) return message.channel.send(toolarge)

        if(type.toLowerCase() == 'base64') {
            const base64outputraw = new Buffer.from(text)
            const base64output = base64outputraw.toString('base64')
            if(base64output.length > 1024) return message.channel.send('Error: output was too long (above 1024 characters)')
            const base64outputembed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .addField('Input', text)
            .addField('Encrypted (Base 64)', `\`${base64output}\``)
            .setAuthor('Text Encryption', client.user.displayAvatarURL())
            message.channel.send(base64outputembed)
        } else if(type.toLowerCase() == 'binary') {
            let output = '';
            for(i = 0; i < text.length; i++) {
                output += text[i].charCodeAt(0).toString(2) + " ";
            }
            if(output.length > 1024) return message.channel.send('Error: output was too long (above 1024 characters)')
            const binaryoutputembed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .addField('Input', text)
            .addField('Encrypted (Binary)', `\`${output}\``)
            .setAuthor('Text Encryption', client.user.displayAvatarURL())
            message.channel.send(binaryoutputembed)
        } else {
            return message.channel.send(invalidtype)
        }
    }
}