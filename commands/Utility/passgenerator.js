const Discord = require('discord.js')

module.exports = {
    name: 'passgenerator',
    description: 'Generates a random password. If the amount of charecters you want your password to be is not specified, it will generate a 12 charecter password',
    usage: 'passgenerator <amount of charecters>',
    aliases: ['passwordgenerator', 'passgen', 'passwordgen'],
    async execute(client, message, args) {
        const amount = args[0]
        let password = ''
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?$@#%&_';

        if(!amount) {
            for (var i = 0; i < 12; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            const output = new Discord.MessageEmbed()
            .setColor('RANDOM')
            .setAuthor('Password Generator', client.user.displayAvatarURL())
            .setDescription(`Randomly generated passwords are not saved anywhere, or shown to anyone else. **Only you can see this password**\n\n\`${password}\``)
            message.author.send(output)
            message.channel.send('Password sent in your DM\'s <a:check:800062978899836958>')
            return;
        } else {
            if(isNaN(amount)) return message.channel.send('Please specify a number')
            if (amount > 1000) return message.channel.send('The max length is 1000 characters')
            if(amount < 1) return message.channel.send('The minimum length is 1 character')
            for(var i = 0; i < amount; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            const output = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setAuthor('Password Generator', client.user.displayAvatarURL())
            .setDescription(`Randomly generated passwords are not saved anywhere, or shown to anyone else. **Only you can see this password**\n\n\`${password}\``)
            if(amount < 8) output.setFooter('Warning: this password is not secure, as it\'s very short')
            if(amount > 30) output.setFooter('Warning: This password may be too long for some websites or applications')
            message.author.send(output)
            message.channel.send('Password sent in your DM\'s <a:check:800062978899836958>')
        }
    }
}