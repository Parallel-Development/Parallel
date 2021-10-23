const Discord = require('discord.js');
const { MessageButton, MessageActionRow } = Discord;
const settingsSchema = require('../schemas/settings-schema');
const automodSchema = require('../schemas/automod-schema');
const blacklistSchema = require('../schemas/blacklist-schema');
const warningSchema = require('../schemas/warning-schema');
const lockSchema = require('../schemas/lock-schema');
const systemSchema = require('../schemas/system-schema');
const tagSchema = require('../schemas/tag-schema');
const afkSchema = require('../schemas/afk-schema');
const cooldown = new Set();
const rps = require('../Buttons/rock-paper-scissors');
const infractions = require('../Buttons/infractions');

module.exports = {
    name: 'interactionCreate',
    async execute(client, interaction) {
        const isBlacklisted = await blacklistSchema.findOne({ ID: interaction.user.id, server: false });
        const isBlacklistedServer = await blacklistSchema.findOne({ ID: interaction.guild.id, server: true });
        if (isBlacklistedServer) {
            const { reason, date, sent } = isBlacklistedServer;
            let failedToSend = false;
            if (!sent) {
                await interaction
                    .reply(`This server is blacklisted!\n\nReason: ${reason}\nDate: ${date}`)
                    .catch(() => (failedToSend = true));

                if (!failedToSend) {
                    await blacklistSchema.updateOne(
                        {
                            ID: interaction.guild.id,
                            server: true
                        },
                        {
                            sent: true
                        }
                    );
                }
            }

            return interaction.guild.leave();
        }

        if (isBlacklisted) {
            const { reason, date, sent } = isBlacklisted;
            let doNotSend = false;
            if (sent) return;

            const blacklistEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setDescription(
                    `You cannot run any commands because you are blacklisted from Parallel. This means I will ignore all your commands. If you believe this blacklist is unjustified, you can submit an appeal [here](https://docs.google.com/forms/d/1xedhPPJONP3tGmL58xQAiTd-XVQ1V8tCkEqUu9q1LWM/edit?usp=drive_web)`
                )
                .setAuthor('You are blacklisted from Parallel!', client.user.displayAvatarURL())
                .addField('Reason', reason)
                .addField('Date', date)
                .setFooter('You cannot appeal your ban if it is not unjustified!');
            await interaction.user.send({ embeds: [blacklistEmbed] }).catch(() => {
                doNotSend = true;
            });

            if (!doNotSend) {
                await blacklistSchema.updateOne(
                    {
                        ID: interaction.user.id,
                        server: false
                    },
                    {
                        sent: true
                    }
                );
            }

            return;
        }

        const settingsCheck = await settingsSchema.findOne({ guildID: interaction.guild.id });
        if (!settingsCheck) {
            await new settingsSchema({
                guildname: interaction.guild.name,
                guildID: interaction.guild.id,
                prefix: client.config.prefix,
                baninfo: 'none',
                delModCmds: false,
                locked: [],
                autowarnexpire: 'disabled',
                manualwarnexpire: 'disabled',
                messageLogging: 'none',
                messageLoggingIgnored: [],
                moderationLogging: 'none',
                automodLogging: 'none',
                modRoles: [],
                modRolePermissions: '402661398',
                shortCommands: [],
                muterole: 'none',
                removerolesonmute: false
            }).save();
        }

        const automodCheck = await automodSchema.findOne({
            guildID: interaction.guild.id
        });

        if (!automodCheck) {
            await new automodSchema({
                guildname: interaction.guild.name,
                guildID: interaction.guild.id,
                filter: 'disabled',
                filterList: [],
                fast: 'disabled',
                walltext: 'disabled',
                flood: 'disabled',
                links: 'disabled',
                allowTenor: {
                    enabled: false,
                    attachmentPermsOnly: false
                },
                invites: 'disabled',
                massmention: 'disabled',
                filterTempMuteDuration: 0,
                fastTempMuteDuration: 0,
                walltextTempMuteDuration: 0,
                linksTempMuteDuration: 0,
                invitesTempMuteDuration: 0,
                massmentionTempMuteDuration: 0,
                filterTempBanDuration: 0,
                fastTempBanDuration: 0,
                walltextTempBanDuration: 0,
                linksTempBanDuration: 0,
                invitesTempBanDuration: 0,
                massmentionTempBanDuration: 0,
                bypassChannels: [],
                bypassRoles: []
            }).save();
        }

        const warningsCheck = await warningSchema.findOne({ guildID: interaction.guild.id });
        if (!warningsCheck) {
            await new warningSchema({
                guildname: interaction.guild.name,
                guildID: interaction.guild.id,
                warnings: []
            }).save();
        }

        const systemCheck = await systemSchema.findOne({ guildID: interaction.guild.id });
        if (!systemCheck) {
            await new systemSchema({
                guildname: interaction.guild.name,
                guildID: interaction.guild.id,
                system: []
            }).save();
        }

        const lockCheck = await lockSchema.findOne({ guildID: interaction.guild.id });
        if (!lockCheck) {
            await new lockSchema({
                guildname: interaction.guild.name,
                guildID: interaction.guild.id,
                channels: []
            }).save();
        }

        const tagCheck = await tagSchema.findOne({ guildID: interaction.guild.id });
        if (!tagCheck) {
            await new tagSchema({
                guildname: interaction.guild.name,
                guildID: interaction.guild.id,
                allowedRoleList: [],
                allowedChannelList: [],
                tags: []
            }).save();
        }

        const afkCheck = await afkSchema.findOne({ guildID: interaction.guild.id });
        if (!afkCheck) {
            await new afkSchema({
                guildname: interaction.guild.name,
                guildID: interaction.guild.id,
                afks: []
            }).save();
        }

        if (interaction.isButton()) {
            if (interaction.customId === 'join' || interaction.customId === 'deny') return rps.run(client, interaction);
            if (
                interaction.customId === 'jumpToBeginning' ||
                interaction.customId === 'goBack' ||
                interaction.customId === 'goForward' ||
                interaction.customId === 'jumpToBack'
            )
                return infractions.run(client, interaction);
        }

        if (cooldown.has(interaction.user.id))
            return interaction.reply({ content: 'You are on cooldown', ephemeral: true });
        else if (!client.config.developers.includes(interaction.user.id)) {
            cooldown.add(interaction.user.id);
            setTimeout(() => {
                cooldown.delete(interaction.user.id);
            }, 750);
        }

        if (!interaction.isCommand()) return;
        if (global.void && !client.config.developers.includes(interaction.user.id)) return;

        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return; // i guess?

        if (command.developer && !client.config.developers.includes(interaction.user.id))
            return client.util.throwError(interaction, 'You cannot run this command.');

        const guildSettings = await settingsSchema.findOne({ guildID: interaction.guild.id });
        const { modRoles, locked, modRolePermissions } = guildSettings;

        const isModerator = modRoles.some(role => interaction.member.roles.cache.has(role));

        const denyAccess = commandName => {
            const errorMessage = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setAuthor('Access Denied')
                .setDescription(`You do not have permission to run the \`${commandName}\` command`);
            return interaction.reply({ embeds: [errorMessage], ephemeral: true });
        };

        if (
            command.permissions &&
            !interaction.member.permissions.has(command.permissions) &&
            (!isModerator || !new Discord.Permissions(modRolePermissions).has(command.permissions))
        )
            return denyAccess(command.name);

        if (command.requiredBotPermission && !interaction.guild.me.permissions.has(command.requiredBotPermission)) {
            let missingPermission = new Discord.Permissions(command.requiredBotPermission);
            missingPermission = missingPermission.toArray();
            if (missingPermission.length > 1) missingPermission = 'ADMINISTRATOR';
            else missingPermission = missingPermission[0].replaceAll('_', ' ');
            const missingPermissionEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setAuthor(`Missing Permissions`)
                .setDescription(
                    `I am missing required permissions for this command to work\nMissing Permission: \`${missingPermission}\``
                );

            return interaction.reply({ embeds: [missingPermissionEmbed] });
        }

        if (
            (locked.includes(interaction.channel.id) || locked.includes(interaction.parent?.id)) &&
            !interaction.member.roles.cache.some(role => modRoles.includes(role)) &&
            !interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
            command.name !== 'tag'
        )
            return interaction.reply({ content: 'Commands are disabled in this channel', ephemeral: true });

        try {
            command.execute(
                client,
                interaction,
                interaction.options.data.reduce((map, arg) => ((map[arg.name] = arg.value), map), {})
            );
        } catch {
            interaction.reply({ content: 'Error executing command', ephemeral: true });
        }
    }
};
