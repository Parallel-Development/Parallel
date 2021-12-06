const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const Infraction = require('../../structures/Infraction');
const Punishment = require('../../structures/Punishment');
const warningSchema = require('../../schemas/warning-schema');
const punishmentSchema = require('../../schemas/punishment-schema');
const ms = require('ms');

module.exports = {
    name: 'massban',
    data: new SlashCommandBuilder()
        .setName('massban')
        .setDescription('Ban multiple useres at once, up to 20 members')
        .addStringOption(option =>
            option
                .setName('users')
                .setDescription('The users to ban. Please separate every user mention or ID by a space')
                .setRequired(true)
        )
        .addStringOption(option => option.setName('reason').setDescription('The reason for the bans'))
        .addStringOption(option => option.setName('duration').setDescription('The duration of the bans')),
    description: 'Ban multiple users at once, up to 20 members',
    requiredBotPermission: Discord.Permissions.FLAGS.BAN_MEMBERS,
    permissions: Discord.Permissions.FLAGS.BAN_MEMBERS,
    async execute(client, interaction, args) {
        const rawUsers = args['users'].split(' ');
        if (rawUsers.length > 20) return client.util.throwError(interaction, 'you can only ban up to 20 users at once');

        if (rawUsers.length > 3) await interaction.reply(`Validating the provided users, please wait...`);
        const resolveUser = async Id => new Promise(async resolve => {
            const user = await client.util.getMember(interaction.guild, Id) || await client.util.getUser(client, Id);
            resolve(user);
        });

        const users = await Promise.all(rawUsers.map(user => resolveUser(user))).then(users => users.filter(user => user));

        if (!users.length) return client.util.throwError(interaction, 'you must provide at least one __valid__ user to ban');

        const userIds = users.map(user => user.id);
        const duplicates = userIds.filter((id, index) => userIds.indexOf(id) !== index);
        if (duplicates.length) return client.util.throwError(interaction, `duplicate users were provided | Error occurred whilst validating user <@${duplicates[0]}>`);

        if (users.some(user => user.id === client.user.id)) return client.util.throwError(interaction, client.config.errors.cannot_punish_myself);
        if (users.some(user => user.id === interaction.user.id)) return client.util.throwError(interaction, client.config.errors.cannot_punish_yourself);
        if (users.some(user => user instanceof Discord.GuildMember && user.roles.highest.position >= interaction.member.roles.highest.position && !interaction.guild.ownerId === interaction.user.id)) return client.util.throwError(interaction, client.config.errors.hierarchy);
        if (users.some(user => user instanceof Discord.GuildMember && user.roles.highest.position >= interaction.guild.me.roles.highest.position)) return client.util.throwError(interaction, client.config.errors.my_hierarchy);

        const resolveBannedUser = async Id => new Promise(async resolve => {
            const bannedUser = await interaction.guild.bans.fetch(Id).catch(() => false);
            resolve(bannedUser);
        })
        
        const bannedUsers = await Promise.all(users.map(user => resolveBannedUser(user.id)));
        if (bannedUsers.some(ban => ban))
            return client.util.throwError(interaction, `you cannot ban users that are already banned | Error occurred whilst validating user ${bannedUsers.find(ban => ban).user.toString()}`);

        const reason = args['reason'] || 'Unspecified';
        const time = args['duration'] ? ms(args['duration']) : null;
        if (time && time > 315576000000) return client.util.throwError(interaction, client.config.errors.time_too_long);

        await interaction
            .reply(`Banning ${users.length} users...`)
            .catch(() => interaction.editReply(`Banning ${users.length} users...`));

        const settings = await settingsSchema.findOne({ guildID: interaction.guild.id });
        const { baninfo } = settings;
        const guildWarnings = await warningSchema.findOne({ guildID: interaction.guild.id });

        let unsuccessfullyBannedUsers = [];

        for (let i = 0; i !== users.length; ++i) {
            const user = users[i];

            if (guildWarnings?.warnings) {
                const bansToExpire = guildWarnings.warnings.filter(
                    warning => warning.expires > Date.now() && warning.type === 'Ban' && warning.userID === user.id
                );

                if (bansToExpire.length) {
                    for (let i = 0; i !== bansToExpire.length; ++i) {
                        const ban = bansToExpire[i];
                        await warningSchema.updateOne(
                            {
                                guildID: interaction.guild.id,
                                warnings: {
                                    $elemMatch: {
                                        punishmentID: ban.punishmentID
                                    }
                                }
                            },
                            {
                                $set: {
                                    'warnings.$.expires': Date.now()
                                }
                            }
                        );
                    }
                }

                const punishmentID = client.util.createSnowflake();

                await punishmentSchema.deleteMany({
                    guildID: interaction.guild.id,
                    type: 'ban',
                    userID: user.id
                });

                if (user instanceof Discord.GuildMember)
                    await new DMUserInfraction(
                        client,
                        'banned',
                        client.config.colors.punishment[2],
                        interaction,
                        user,
                        {
                            reason: reason,
                            punishmentID: punishmentID,
                            time: time,
                            baninfo: baninfo !== 'none' ? baninfo : null
                        }
                    );

                new ModerationLogger(client, 'Banned', interaction.member, user, interaction.channel, {
                    reason: reason,
                    duration: time,
                    punishmentID: punishmentID
                });

                await interaction.guild.members
                    .ban(user, { reason: reason })
                    .catch(() => unsuccessfullyBannedUsers.push(user));

                new Infraction(client, 'Ban', interaction, interaction.member, user, {
                    reason: reason,
                    punishmentID: punishmentID,
                    time: time,
                    auto: false
                });
                if (time)
                    new Punishment(interaction.guild.name, interaction.guild.id, 'ban', user.id, {
                        reason: reason,
                        time: time ? Date.now() + time : 'Never'
                    });
            }
        }

        await interaction.editReply(
            `${
                !unsuccessfullyBannedUsers
                    ? `Successfully banned **${
                          users.length - unsuccessfullyBannedUsers.length
                      }** users, failed to ban **${unsuccessfullyBannedUsers.length}** users`
                    : `Successfully banned all **${users.length}** users`
            }\nBanned users: ${users
                .filter(user => !unsuccessfullyBannedUsers.some(fail => fail.id === user.id))
                .map(user => user.toString())
                .join(', ')}\n\n${
                unsuccessfullyBannedUsers.length
                    ? `Failed to ban: ${unsuccessfullyBannedUsers.map(user => user.toString()).join(', ')}`
                    : ''
            }`
        );
    }
};
