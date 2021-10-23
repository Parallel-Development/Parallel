const Discord = require('discord.js');
const afkSchema = require('../../schemas/afk-schema');

module.exports = {
    name: 'afk',
    description: "Let people know you're AFK if they try to ping you",
    usage: 'afk [reason]',
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    async execute(client, message, args) {
        const isAFK = global.afk.some(afk => afk.ID === message.author.id);
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
        return message.reply(`You are now AFK ${AFKReason ? `- ${AFKReason}` : ''}`);
    }
};
