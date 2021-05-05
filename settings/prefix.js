const settingsSchema = require('../schemas/settings-schema')

exports.run = async(client, message, args) => {
    if (!args[1]) return message.channel.send('Please specify a prefix')

    await settingsSchema.updateOne({
        guildid: message.guild.id
    }, {
        prefix: args[1]
    })
    message.channel.send(`The server prefix for razor is now \`${args[1]}\`. You can ping me for the prefix if you ever forget`)
}