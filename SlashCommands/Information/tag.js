const Discord = require('discord.js');
const tagSchema = require('../../schemas/tag-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'tag',
    description: 'Mention a tag on the server',
    data: new SlashCommandBuilder()
        .setName('tag')
        .setDescription('Mention a tag on the server')
        .addStringOption(option => option.setName('tag_name').setDescription('The tag to mention').setRequired(true))
        .addUserOption(option => option.setName('target').setDescription('The user to mention along with the tag')),
    async execute(client, interaction, args) {
        const guildTagSettings = await tagSchema.findOne({ guildID: interaction.guild.id });
        const { allowedRoleList } = guildTagSettings;

        if (
            !interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
            !interaction.member.roles.cache.some(role => allowedRoleList.includes(role.id))
        )
            return client.util.throwError(interaction, 'you do not have permission to use the server tags');

        const tag = args['tag_name'];
        if (!tag) return client.util.throwError(interaction, 'please specify a tag name');

        const validateTag = await tagSchema.findOne({
            guildID: interaction.guild.id,
            tags: { $elemMatch: { name: tag } }
        });
        if (!validateTag) return client.util.throwError(interaction, 'no tag found');

        const content = validateTag.tags.find(key => key.name === tag).content;

        const target = await client.util.getMember(interaction.guild, args['target']);

        return interaction.reply(`${target ?? ''}\n${content}`);
    }
};
