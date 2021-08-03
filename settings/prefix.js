const settingsSchema = require('../schemas/settings-schema')

exports.run = async (client, message, args) => {
    if (!args[1]) return message.reply('Please specify a prefix')
    const prefix = args[1]

    await settingsSchema.updateOne({
        guildID: message.guild.id
    }, {
        prefix: prefix
    })
    message.reply(`The server prefix for Parallel is now \`${prefix}\`. You can ping me for the prefix if you ever forget`)
}