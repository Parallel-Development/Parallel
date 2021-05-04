const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema')

exports.run = async(client, message, args) => {
    if (!args[1]) return message.channel.send('Please specify the custom message you wish to use. Make your message `none` to disable the custom message field. Run `settings baninfo current` to get the current ban info message\nTip: to make a hyperlink, follow this format: \`[text](link)\`')
    const banInfoMessage = args.slice(1).join(' ')
    if(args[1] == 'current') {
        const getBanInfo = await settingsSchema.findOne({
            guildid: message.guild.id
        })
        let { baninfo } = getBanInfo
        if(baninfo == 'none') return message.channel.send('You have no current ban information field set')
        const banInfoCurrentMessage = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription(`Your current ban information field: ${baninfo}`)
        return message.channel.send(banInfoCurrentMessage)
    }

    await settingsSchema.updateOne({
        guildid: message.guild.id
    }, {
        baninfo: banInfoMessage
    })
    const successMessage = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription(`Success! Message: ${banInfoMessage}`)
    message.channel.send(successMessage)
}