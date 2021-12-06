const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');
const settingsSchema = require('../../schemas/settings-schema');
const systemSchema = require('../../schemas/system-schema');
const tagSchema = require('../../schemas/tag-schema');

module.exports = {
    name: 'confirm',
    description: 'Confirm an action',
    usage: 'confirm',
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    async execute(client, message, args) {
        if (!global.confirmationRequests.some(request => request.ID === message.author.id))
            return client.util.throwError(message, 'You have no pending confirmation request!');
        if (Date.now() - global.confirmationRequests.find(request => request.ID === message.author.id).at > 10000) {
            global.confirmationRequests.pop({ ID: message.author.id });
            return client.util.throwError(
                message,
                'The confirmation request has expired, please run the command again and confirm quicker!'
            );
        }

        client.cache.settings.delete(message.guild.id);

        const request = global.confirmationRequests.find(request => request.ID === message.author.id);

        if (request.request === 'clearInfractions') {
            await warningSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    $pull: {
                        warnings: {
                            userID: request.data.ID
                        }
                    }
                }
            );

            const clearedInfractionsEmbed = new Discord.MessageEmbed()
                .setColor(client.util.mainColor(message.guild))
                .setAuthor('Action Confirmed!', client.user.displayAvatarURL())
                .setDescription(
                    `All warnings have been cleared from **${
                        (await client.util.getUser(client, request.data.ID)).tag
                    }**`
                );
            await message.reply({ embeds: [clearedInfractionsEmbed] });
            global.confirmationRequests.pop({ ID: message.author.id });
        } else if (request.request === 'clearServerInfractions') {
            await warningSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    warnings: []
                }
            );

            const clearedServerInfractionsEmbed = new Discord.MessageEmbed()
                .setColor(client.util.mainColor(message.guild))
                .setAuthor('Action Confirmed!', client.user.displayAvatarURL())
                .setDescription(`All server warnings have been cleared`);
            await message.reply({ embeds: [clearedServerInfractionsEmbed] });
            global.confirmationRequests.pop({ ID: message.author.id });
        } else if (request.request === 'deleteAllShortcuts') {
            await settingsSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    shortcutCommands: []
                }
            );

            const deletedAllShortcutsEmbed = new Discord.MessageEmbed()
                .setColor(client.util.mainColor(message.guild))
                .setAuthor('Action Confirmed!', client.user.displayAvatarURL())
                .setDescription(`All server shortcuts have been removed`);
            await message.reply({ embeds: [deletedAllShortcutsEmbed] });
            global.confirmationRequests.pop({ ID: message.author.id });
        } else if (request.request === 'resetSystem') {
            await systemSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    system: []
                }
            );

            const clearedSystem = new Discord.MessageEmbed()
                .setColor(client.util.mainColor(message.guild))
                .setAuthor('Action Confirmed!', client.user.displayAvatarURL())
                .setDescription(`Reset the punishment system`);
            await message.reply({ embeds: [clearedSystem] });
            global.confirmationRequests.pop({ ID: message.author.id });
        } else if (request.request === 'removeAllTags') {
            await tagSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    tags: []
                }
            );
            return message.reply(`Successfully removed all tags`);
        }
    }
};
