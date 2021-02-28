const Discord = require('discord.js');
const { execute } = require('../Moderation/ban');

module.exports = {
    name: 'reload',
    description: 'Reloads the specified file',
    usage: 'reload <file>',
    async execute(client, message, args) {
        if (message.author.id !== '633776442366361601') return message.react('🔒');
        if(!args[0]) return message.channel.send('Please specify a directory')
        if(!args[1]) return message.channel.send('Please specify a file')
        try {
            delete require.cache[require.resolve(`../${args[0]}/${args[1]}.js`)];
        } catch (err) {
            return message.channel.send(`Unable to load file: \`${args[1]}\``)
        }

        message.channel.send(`Successfully reloaded file: \`${args[1]}\``)
    }
}


