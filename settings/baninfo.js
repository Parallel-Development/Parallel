const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema')

exports.run = async (client, message, args) => {

    if (!args[1]) return message.reply('Please specify the custom message you wish to use. Make your message `none` to disable the custom message field. Run `settings baninfo current` to get the current ban info message\nTip: to make a hyperlink, follow this format: \`[text](link)\`')

    const banInfoMessage = args.slice(1).join(' ')
    if (args[1] === 'current') {
        const getBanInfo = await settingsSchema.findOne({
            guildID: message.guild.id
        })
        const { baninfo } = getBanInfo
        if (baninfo === 'none') return message.reply('You have no current ban information field set')
        const banInfoCurrentMessage = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Your current ban information field: ${baninfo}`)
        return message.reply({ embeds: [banInfoCurrentMessage] })
    }

    if (banInfoMessage.length > 1000) return message.reply('Ban information field must be less than or equal to 1000 characters!')

    await settingsSchema.updateOne({
        guildID: message.guild.id
    }, {
        baninfo: banInfoMessage
    })

    const successMessage = new Discord.MessageEmbed()
        .setColor('#09fff2')
    if (banInfoMessage !== 'none') successMessage.setDescription(`Success! Message: ${banInfoMessage}`)
    else successMessage.setDescription(`Success! The ban info module has been disabled!`)
    return message.reply({ embeds: [successMessage] })
}