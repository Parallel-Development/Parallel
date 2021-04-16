const Discord = require('discord.js')

module.exports = {
    name: 'decrypt',
    description: 'Decrypts hex or binary',
    usage: 'decrypt <type: hex, binary> <text>',
    aliases: ['decode'],
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
        if(!type) return message.channel.send(missingargtype);

        const text = args.splice(1).join(' ');
        if(!text) return message.channel.send(notext)
        const toolarge = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription(`This input is too large! Please keep it at a max of 500 characters (You attempted to encrypt \`${text.length}\` characters`)
        .setAuthor('Error', client.user.displayAvatarURL())
        if(!text) return message.channel.send(notext)
        if(text.length > 500) return message.channel.send(toolarge)

        if(type.toLowerCase() == 'base64') {
            const base64outputraw = new Buffer.from(text, 'base64')
            const base64output = base64outputraw.toString();
            const base64outputembed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .addField('Input (Base64)', text)
            .addField('Decrypted Text', `\`${base64output}\``)
            .setAuthor('Text Encryption', client.user.displayAvatarURL())
            message.channel.send(base64outputembed)
        } else if(type.toLowerCase() == 'binary') {
            message.channel.send('Binary is not supported yet')
        } else {
            return message.channel.send(invalidtype)
        }
    }
}