const Discord = require('discord.js');
const tagSchema = require('../../schemas/tag-schema');

module.exports = {
    name: 'tag',
    description: 'Mention a tag on the server',
    usage: 'tag [tag] <target user>',
    async execute(client, message, args) {

        const guildTagSettings = await tagSchema.findOne({ guildID: message.guild.id });
        const { allowedRoleList, allowedChannelList } = guildTagSettings;

        if (
            !message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) 
            && !message.member.roles.cache.some(role => allowedRoleList.includes(role.id))
        ) return client.util.throwError(message, 'you do not have permission to use the server tags');

        const tag = args[0];
        if(!tag) return client.util.throwError(message, 'please specify a tag name');

        const validateTag = await tagSchema.findOne({ guildID: message.guild.id, tags: { $elemMatch: { name: tag }}});
        if(!validateTag) return client.util.throwError(message, 'no tag found');

        const content = validateTag.tags.find(key => key.name === tag).content;

        const target = await client.util.getMember(message.guild, args[1]);

        return message.reply(`${target ?? ''}\n${content}`);
    }
}