const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');
const automodSchema = require('../schemas/automod-schema');
const warningSchema = require('../schemas/warning-schema');
const lockSchema = require('../schemas/lock-schema');
const systemSchema = require('../schemas/system-schema');
const tagSchema = require('../schemas/tag-schema');
const afkSchema = require('../schemas/afk-schema');
const rps = require('../Buttons/rock-paper-scissors');
const infractions = require('../Buttons/infractions');

module.exports = {
    name: 'interactionCreate',
    async execute(client, interaction) {
        if (!client.cache.whitelistedUsers.includes(interaction.user.id)) {
            const userBlacklist = await client.helpers.blacklist.check(interaction.user.id);
            if (userBlacklist.isBlacklisted) {
                if (userBlacklist.sent) return;
                return client.helpers.blacklist.DMUserBlacklist(
                    client,
                    interaction.user.id,
                    userBlacklist.reason,
                    userBlacklist.date
                );
            }

            client.cache.whitelistedUsers.push(interaction.user.id);
        }

        if (client.cache.whitelistedServers.includes(interaction.guild.id)) {
            const serverBlacklist = await client.helpers.blacklist.check(interaction.guild.id, true);

            if (serverBlacklist.isBlacklisted) {
                if (serverBlacklist.sent) return interaction.guild.leave();
                return client.helpers.blacklist.sendServerBlacklist(
                    client,
                    interaction,
                    serverBlacklist.reason,
                    serverBlacklist.date
                );
            }

            client.cache.whitelistedServers.push(interaction.user.id);
        }

        const settings =
            client.cache.settings.get(interaction.guild.id) ||
            (await settingsSchema
                .findOne({
                    guildID: interaction.guild.id
                })
                .catch(() => {})) ||
            (await new settingsSchema({
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
                removerolesonmute: false,
                errorConfig: {
                    missingPermission: 'respond',
                    disabledCommandChannel: 'respond',
                    deleteDelay: '5000'
                }
            }).save());

        if (!client.cache.settings.has(interaction.guild.id)) client.cache.settings.set(interaction.guild.id, settings);

        const { modRoles, locked, modRolePermissions, errorConfig } = settings;

        if (!client.cache.hasAllSchemas.includes(interaction.guild.id)) {
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
                    links: 'disabled',
                    maliciouslinks: 'disabled',
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
                    maliciouslinksTempMuteDuration: 0,
                    maliciouslinksTempBanDuration: 0,
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

            client.cache.hasAllSchemas.push(interaction.guild.id);
        }

        if (interaction.isButton()) {
            if (interaction.customId === 'join' || interaction.customId === 'deny') return rps.run(client, interaction);
            if (
                interaction.customId === 'jumpToBeginning' ||
                interaction.customId === 'goBack' ||
                interaction.customId === 'goForward' ||
                interaction.customId === 'jumpToBack' ||
                interaction.customId === 'stop'
            )
                return infractions.run(client, interaction);

            return;
        }

        if (!interaction.isCommand()) return;

        const cooldownInformation = client.helpers.cooldown.check(interaction.user.id);
        if (cooldownInformation.inCooldown === true) {
            if (cooldownInformation.hard) return;
            else {
                if (cooldownInformation.triggered) return client.helpers.cooldown.makeHard(interaction.user.id);
                client.helpers.cooldown.makeTriggered(interaction.user.id);
                return client.util.throwError(
                    interaction,
                    `too fast: Please wait a few moments before running another command`
                );
            }
        } else client.helpers.cooldown.add(interaction.user.id);
        if (global.void && !client.config.developers.includes(interaction.user.id)) return;

        const command = client.slashCommands.get(interaction.commandName);
        if (!command)
            return client.util.throwError(
                interaction,
                'unexpected: the interaction command exists but a file could not be found associated with it. (This error was not supposed to occur. This did **not** occour due to missing permissions or bad syntax. Please report this case to a developer or via the bug report forms\n\n[Support Server](https://discord.gg/v2AV3XtnBM)\n[Bug Report Form](https://docs.google.com/forms/d/1DcWLQRBT367IivyisDL6YrH-19PrOmuwO4r2uj1idGw/edit)'
            );

        if (command.developer && !client.config.developers.some(ID => ID === interaction.user.id))
            return client.util.throwError(interaction, 'developer commands cannot be ran by non-developers');

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

        if (command.requiredBotPermissions && !interaction.guild.me.permissions.has(command.requiredBotPermissions)) {
            let missingPermission = new Discord.Permissions(command.requiredBotPermissions);
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

        const options = interaction.options.data.reduce((map, arg) => ((map[arg.name] = arg.value), map), {});

        try {
            command.execute(client, interaction, options);
        } catch {
            return interaction.reply({ content: 'Error executing command', ephemeral: true });
        }
    }
};
