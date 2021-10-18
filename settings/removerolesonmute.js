const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async(client, message, args) => {

    if (args[1].toLowerCase() === 'current') {
        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
        const { removerolesonmute } = guildSettings;

        const removerolesonmuteStateEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(removerolesonmute ? 'All roles will get removed from users when muted, and the muted role will get added' : 'All roles will remain with the user when muted, and the muted role will be added');

        return message.reply({ embeds: [removerolesonmuteStateEmbed] })
    }

    if (args[1].toLowerCase() === 'enable') {
        await settingsSchema.updateOne({
            guildID: message.guild.id
        },
        {
            removerolesonmute: true
        })

        return message.reply(`${client.config.emotes.success} I will now remove all roles from a user when they are muted and add the muted role to them`)
    } else if (args[1].toLowerCase() === 'disable') {
        await settingsSchema.updateOne({
            guildID: message.guild.id
        },
        {
            removerolesonmute: false
        })

        return message.reply(`${client.config.emotes.success} I will now only add the muted role to a user when they are muted`)
    } else {
        return client.util.throwError(message, client.config.errors.invalid_option);
    }
}