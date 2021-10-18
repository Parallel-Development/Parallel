const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'get-invite',
    description: 'Get a bot invite from any bot using its user ID',
    data: new SlashCommandBuilder()
        .setName('get-invite')
        .setDescription('Get a bot invite from any bot using its user ID')
        .addUserOption(option => option.setName('bot').setDescription('The user ID of the bot').setRequired(true))
        .addBooleanOption(option =>
            option
                .setName('no_slash_commands')
                .setDescription('Do not allow the bot to create slash commands on the server')
        ),
    async execute(client, interaction, args) {
        const bot = await client.users.fetch(args['bot']);
        if (!bot.bot) return client.util.throwError(interaction, 'The provided user is not a bot!');

        const invite = `https://discord.com/oauth2/authorize?client_id=${bot.id}&scope=bot${
            !args['no_slash_commands'] ? '%20applications.commands' : ''
        }&permissions=2048`;
        return interaction.reply(
            `Invite to **${
                bot.tag
            }**: ${invite}\nPlease note if the bot is set to private, it cannot be invited by anyone but the bot developers\n\n${
                +bot.id[0] < 3 ? 'This is a very old bot and the invite may not work' : ''
            }`
        );
    }
};
