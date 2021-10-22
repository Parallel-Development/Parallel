const automodSchema = require('../schemas/automod-schema');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
    const option = args[1].toLowerCase();
    if (!option) return client.util.throwError(message, 'Please specify a toggle');

    if (option === 'current') {
        const guildSettings = await automodSchema.findOne({ guildID: message.guild.id });
        const { allowTenor } = guildSettings;

        const currentAllowTenorStateEmbed = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(message.guild))
            .setDescription(
                `This module is currently ${allowTenor.enabled ? 'enabled' : 'disabled'} ${
                    allowTenor.attachmentPermsOnly
                        ? ' | Users without attachment permissions will still get affected'
                        : allowTenor.enabled
                        ? ' | All users, regardless of if they have attachment permisions will not be affected by the Parallel link automod from sending a tenor link'
                        : ''
                }`
            );

        return message.reply({ embeds: [currentAllowTenorStateEmbed] });
    }

    if (!(option === 'enable' || option === 'disable'))
        return client.util.throwError(message, client.config.errors.invalid_option);
    const attachmentPermsOnly = args[2] === 'true' ? true : false;

    await automodSchema.updateOne(
        {
            guildID: message.guild.id
        },
        {
            allowTenor: {
                enabled: option === 'enabled' ? true : false,
                attachmentPermsOnly: attachmentPermsOnly
            }
        }
    );

    if (option === 'enable') {
        await automodSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                allowTenor: {
                    enabled: true,
                    attachmentPermsOnly: attachmentPermsOnly
                }
            }
        );
        return message.reply(
            'Tenor links will now be excluded from the link automod' +
                (attachmentPermsOnly ? ' | Users without attachment perms will still get affected' : '')
        );
    } else {
        await automodSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                allowTenor: {
                    enabled: false,
                    attachmentPermsOnly: false
                }
            }
        );
        return message.reply('Tenor links will now no longer be excluded from the link automod');
    }
};
