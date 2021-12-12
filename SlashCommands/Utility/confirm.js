const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const warningSchema = require('../../schemas/warning-schema');
const settingsSchema = require('../../schemas/settings-schema');
const systemSchema = require('../../schemas/system-schema');
const tagSchema = require('../../schemas/tag-schema');

module.exports = {
    name: 'confirm',
    description: 'Confirm an action',
    data: new SlashCommandBuilder().setName('confirm').setDescription('Confirm an action'),
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    async execute(client, interaction, args) {
        if (!global.confirmationRequests.some(request => request.ID === interaction.user.id))
            return client.util.throwError(interaction, 'you have no pending confirmation request!');
        if (Date.now() - global.confirmationRequests.find(request => request.ID === interaction.user.id).at > 10000) {
            global.confirmationRequests.pop({ ID: interaction.user.id });
            return client.util.throwError(
                interaction,
                'The confirmation request has expired, please run the command again and confirm quicker!'
            );
        }

        client.cache.settings.delete(interaction.guild.id);

        const request = global.confirmationRequests.find(
            request => request.ID === interaction.user.id && request.guildID === interaction.guild.id
        );

        if (request.request === 'clearInfractions') {
            await warningSchema.updateOne(
                {
                    guildID: interaction.guild.id
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
                .setColor(client.util.getMainColor(interaction.guild))
                .setAuthor('Action Confirmed!', client.user.displayAvatarURL())
                .setDescription(
                    `All warnings have been cleared from **${
                        (await client.util.getUser(client, request.data.ID)).tag
                    }**`
                );
            await interaction.reply({ embeds: [clearedInfractionsEmbed] });
            global.confirmationRequests.pop({ ID: interaction.user.id });
        } else if (request.request === 'clearServerInfractions') {
            await warningSchema.updateOne(
                {
                    guildID: interaction.guild.id
                },
                {
                    warnings: []
                }
            );

            const clearedServerInfractionsEmbed = new Discord.MessageEmbed()
                .setColor(client.util.getMainColor(interaction.guild))
                .setAuthor('Action Confirmed!', client.user.displayAvatarURL())
                .setDescription(`All server warnings have been cleared`);
            await interaction.reply({ embeds: [clearedServerInfractionsEmbed] });
            global.confirmationRequests.pop({ ID: interaction.user.id });
        } else if (request.request === 'deleteAllShortcuts') {
            await settingsSchema.updateOne(
                {
                    guildID: interaction.guild.id
                },
                {
                    shortcutCommands: []
                }
            );

            const deletedAllShortcutsEmbed = new Discord.MessageEmbed()
                .setColor(client.util.getMainColor(interaction.guild))
                .setAuthor('Action Confirmed!', client.user.displayAvatarURL())
                .setDescription(`All server shortcuts have been removed`);
            await interaction.reply({ embeds: [deletedAllShortcutsEmbed] });
            global.confirmationRequests.pop({ ID: interaction.user.id });
        } else if (request.request === 'resetSystem') {
            await systemSchema.updateOne(
                {
                    guildID: interaction.guild.id
                },
                {
                    system: []
                }
            );

            const clearedSystem = new Discord.MessageEmbed()
                .setColor(client.util.getMainColor(interaction.guild))
                .setAuthor('Action Confirmed!', client.user.displayAvatarURL())
                .setDescription(`Reset the punishment system`);
            await interaction.reply({ embeds: [clearedSystem] });
            global.confirmationRequests.pop({ ID: interaction.user.id });
        } else if (request.request === 'resetSystem') {
            await systemSchema.updateOne(
                {
                    guildID: interaction.guild.id
                },
                {
                    system: []
                }
            );

            const clearedSystem = new Discord.MessageEmbed()
                .setColor(client.util.getMainColor(interaction.guild))
                .setAuthor('Action Confirmed!', client.user.displayAvatarURL())
                .setDescription(`Reset the punishment system`);
            await interaction.reply({ embeds: [clearedSystem] });
            global.confirmationRequests.pop({ ID: interaction.user.id });
        } else if (request.request === 'removeAllTags') {
            await tagSchema.updateOne(
                {
                    guildID: interaction.guild.id
                },
                {
                    tags: []
                }
            );
            return interaction.reply(`Successfully removed all tags`);
        }
    }
};
