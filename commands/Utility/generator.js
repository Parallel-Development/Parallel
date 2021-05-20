const Discord = require('discord.js')

module.exports = {
    name: 'generator',
    description: 'Generates a random code. If the amount of charecters you want your code to be is not specified, it will generate a 12 charecter code\n**Not suggested for password usage**',
    usage: 'generator <amount of charecters>',
    aliases: ['randomgenerator', 'gen'],
    async execute(client, message, args) {
        const amount = args[0]
        let randomCode = ''
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?$@#%&_';

        if(!amount) {
            for (var i = 0; i < 12; i++) {
                randomCode += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            const output = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setAuthor('Random Code Generator', client.user.displayAvatarURL())
            .setDescription(`Randomly generated codes are not saved anywhere, or shown to anyone else. **Only you can see this code**\n\n\`${randomCode}\``)
            .setFooter('Note: it is unsuggested to use these codes as passwords, as sending passwords via Discord is not secure')
            message.author.send(output)
            .catch(() => {
                return message.channel.send('Failed to send code to your DM\'s. Are your DM\'s on?')
            })
            message.channel.send('Random code sent via DM\'s <a:check:800062978899836958>')
            return;
        } else {
            if(isNaN(amount)) return message.channel.send('Please specify a number')
            if (amount > 1000) return message.channel.send('The max length is 1000 characters')
            if(amount < 1) return message.channel.send('The minimum length is 1 character')
            for(var i = 0; i < amount; i++) {
                randomCode += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            const output = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setAuthor('Password Generator', client.user.displayAvatarURL())
            .setDescription(`Randomly generated codes are not saved anywhere, or shown to anyone else. ** Only you can see this code **\n\n\`${randomCode}\``)
            .setFooter('Note: it is unsuggested to use these codes as passwords, as sending passwords via Discord is not secure')

            message.author.send(output)
            message.channel.send('Password sent in your DM\'s <a:check:800062978899836958>')
        }
    }
}