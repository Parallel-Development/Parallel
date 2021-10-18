const settingsSchema = require('../schemas/settings-schema');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
    const option = args[1].toLowerCase();

    if (option === 'current') {
        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
        const { delModCmds } = guildSettings;

        const delModCmdsStateEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(
                `Moderation command triggers are set to ${
                    delModCmds ? 'get' : '**not** get'
                } deleted after being executed`
            );

        return message.reply({ embeds: [delModCmdsStateEmbed] });
    }

    switch (option) {
        case 'enable':
            await settingsSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    delModCmds: true
                }
            );
            message.reply('The command ran by the moderator for all moderation commands will now be deleted');
            break;
        case 'disable':
            await settingsSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    delModCmds: false
                }
            );
            message.reply('The command ran by the moderator for all moderation commands will no longer be deleted');
            break;
        default:
            if (!option) return message.reply(client.config.errors.missing_argument_option);
            else return message.reply(client.config.invalid_option);
    }
};
