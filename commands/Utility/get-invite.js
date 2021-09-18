const Discord = require('discord.js');

module.exports = {
    name: 'get-invite',
    description: 'Get a bot invite from any bot using its user ID',
    usage: 'get-invite [bot] <no slash commands boolean: true, false>',
    async execute(client, message, args) {
        if(!args[0]) return await client.util.throwError(message, client.config.errors.missing_arugment_user)
        const bot = await client.util.getUser(client, args[0]);
        if(!bot) return await client.util.throwError(message, client.config.errors.invalid_user);
        const no_slash_commands = args[1] === 'true'
        if(!bot.bot) return await client.util.throwError(message, 'The provided user is not a bot!');

        const invite = `https://discord.com/oauth2/authorize?client_id=${bot.id}&scope=bot${!no_slash_commands ? '%20applications.commands' : ''}&permissions=2048`;
        return message.reply(`Invite to **${bot.tag}**: ${invite}\nPlease note if the bot is set to private, it cannot be invited by anyone but the bot developers\n\n${+bot.id[0] < 3 ? 'This is an old bot and the invite may not work' : ''}`);
    }
}