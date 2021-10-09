const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');

module.exports = {
    name: 'cancel',
    description: 'Cancel a pending for confirmation action',
    usage: 'cancel',
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    async execute(client, message, args) {

        if (!global.confirmationRequests.some(request => request.ID === message.author.id)) return client.util.throwError(message, 'You have no pending confirmation request!');
        if (Date.now() - global.confirmationRequests.find(request => request.ID === message.author.id).at > 10000) {
            global.confirmationRequests.pop({ ID: message.author.id })
            return client.util.throwError(message, 'Your confirmation request has already expired')
        }

        global.confirmationRequests.pop({ ID: message.author.id });

        const cancelEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setAuthor('Action Cancelled!', client.user.displayAvatarURL())
        .setDescription(`✅ Successfully cancelled your pending confirmation request`);

        return message.reply({ embeds:[cancelEmbed] })
        
    }
}