const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema')

module.exports = {
    name: 'clear-infractions',
    description: 'Clears all infractions from a user',
    usage: 'clear-infractions [user]',
    aliases: ['clear-warnings', 'clear-warn', 'clear-warns'],
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    async execute(client, message, args)  {

        if (!args[0]) return await client.util.throwError(message, client.config.errors.missing_argument_user);

        const user = await client.util.getUser(client, args[0])
        if (!user) return await client.util.throwError(message, client.config.errors.invalid_user);

        const guildWarnings = await warningSchema.findOne({
            guildID: message.guild.id,
        })
        const userWarnings = guildWarnings.warnings.filter(warning => warning.userID === user.id)

        if (!userWarnings.length) return message.reply('This user has no infractions');

        message.reply(`Are you sure? This will delete all warnings from **${user.tag}**. If you are sure, respond with the user's discriminator (the 4 digits after their username)`);
        const collectorFilter = m => m.author.id === message.author.id;
        const collector = new Discord.MessageCollector(message.channel, { filter: collectorFilter, time: 30000 })
        collector.on('collect', async(message) => {
            if (message.content === `#${user.discriminator}` || message.content === user.discriminator) {
                await warningSchema.updateOne({
                    guildID: message.guild.id,
                },
                {
                    $pull: {
                        warnings: {
                            userID: user.id
                        }
                     }
                })

                const all = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setDescription(`${client.config.emotes.success} All infractions have been removed from **${user.tag}**`)

                message.reply({ embeds: [all] });
                collector.stop();

            } else {
                collector.stop();
                return message.reply('Action Cancelled')
            }
        })
    }
}
