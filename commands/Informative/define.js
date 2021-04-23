const Discord = require('discord.js')
const googleDictionaryApi = require('google-dictionary-api')

module.exports = {
    name: 'define',
    description: 'Get\'s the definition of the specified word. Only supports english words',
    usage: 'define (word)',
    aliases: ['dictionary', 'word'],
    async execute(client, message, args) {
        const word = args.join(' ')
        if(!word) return message.channel.send('Please specify a word to look up')

        const searching = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription('Searching up word... <a:loading:834973811735658548>')

        const msg = await message.channel.send(searching)

        let failed = false
        let description = []
        let count = 0
        await googleDictionaryApi.search(word)
        .then(results => {
            for(i in results[0].meaning) {
                for(x of results[0].meaning[i]) {
                    count++
                    description.push(`${count}) ${x.definition}`)
                }
            }
        }).catch(() => {
            failed = true
        })

        const failedEmbed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription(`No information found for the word \`${word}\``)

        if(failed) return msg.edit(failedEmbed)

        const wordInformation = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setAuthor(`Dictionary - ${word}`, client.user.displayAvatarURL())
        .setDescription(description.join('\n\n'))

        msg.edit(wordInformation)

    }
}