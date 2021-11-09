const Discord = require('discord.js');
const afkSchema = require('../../schemas/afk-schema');
const settingsSchema = require('../../schemas/settings-schema');

module.exports = {
    name: 'afk',
    description: "Let people know you're AFK if they try to ping you",
    usage: 'afk [reason]',
    async execute(client, message, args) {
        const guildAFK = await afkSchema.findOne({ guildID: message.guild.id });
        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
        const { modRoles } = guildSettings;
        const { allowedRoles, afks } = guildAFK;

        if (
            !message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
            !message.member.roles.cache.some(role => modRoles.includes(role.id)) &&
            !message.member.roles.cache.some(role => allowedRoles.includes(role.id))
        )
            return client.util.throwError(message, 'you do not have permission to use the afk command');

        const isAFK = afks.some(afk => afk.userID === message.author.id);
        if (isAFK) {
            await afkSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    $pull: {
                        afks: {
                            userID: message.author.id
                        }
                    }
                }
            );

            if (message.member.displayName.startsWith('[AFK] '))
                await message.member.setNickname(`${message.member.displayName.slice(5)}`).catch(() => {});

            return message.reply(`I removed your AFK status!`);
        }
        const AFKReason = args.join(' ') || undefined;
        if (AFKReason?.length > 200) return message.reply('Please make your AFK reason 200 characters or less');
        await afkSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                $push: {
                    afks: {
                        userID: message.author.id,
                        reason: AFKReason,
                        date: Date.now()
                    }
                }
            }
        );

        if (!message.member.displayName.startsWith('[AFK] '))
            await message.member.setNickname(`[AFK] ${message.member.displayName}`).catch(() => {});

        return message.reply(`You are now marked as AFK ${AFKReason ? `- ${AFKReason}` : ''}`);
    }
};
