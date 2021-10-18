const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema')

module.exports = {
    name: 'clear-infractions',
    description: 'Clears all infractions from a user',
    usage: 'clear-infractions [user]',
    aliases: ['clear-warnings', 'clear-warn', 'clear-warns'],
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    async execute(client, message, args)  {

        if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_user);

        const user = await client.util.getUser(client, args[0])
        if (!user) return client.util.throwError(message, client.config.errors.invalid_user);

        const guildWarnings = await warningSchema.findOne({
            guildID: message.guild.id,
        })
        const userWarnings = guildWarnings.warnings.filter(warning => warning.userID === user.id)

        if (!userWarnings.length) return message.reply('This user has no infractions');

        if (global.confirmationRequests.some(request => request.ID === message.author.id)) global.confirmationRequests.pop({ ID: message.author.id })
        global.confirmationRequests.push({ ID: message.author.id, guildID: message.guild.id, request: 'clearInfractions', at: Date.now(), data: { ID: user.id } });
        return message.reply(`Are you sure? This will delete all warnings from **${user.tag}**. To confirm, run the \`confirm\` command. To cancel, run the \`cancel\` command`);
    }
}
