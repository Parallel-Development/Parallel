const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'punishinfo',
    description: 'View more in depth detail of a punishment',
    data: new SlashCommandBuilder()
        .setName('punishinfo')
        .setDescription('View more in depth detail of a punishment')
        .addStringOption(option =>
            option.setName('id').setDescription('The punishment ID to get information of').setRequired(true)
        ),
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    async execute(client, interaction, args) {
        const ID = args['id'];

        const findPunishmentID = await warningSchema.findOne({
            guildID: interaction.guild.id,
            warnings: {
                $elemMatch: {
                    punishmentID: ID
                }
            }
        });

        if (!findPunishmentID) return client.util.throwError(interaction, client.config.errors.invalid_punishmentID);

        const userID = findPunishmentID.warnings.find(key => key.punishmentID === ID).userID;
        const user = await client.users.fetch(userID).catch(() => {});
        const type = findPunishmentID.warnings.find(key => key.punishmentID === ID).type;
        const moderatorID = findPunishmentID.warnings.find(key => key.punishmentID === ID).moderatorID;
        const moderator = await client.users.fetch(moderatorID).catch(() => {});
        const expires = findPunishmentID.warnings.find(key => key.punishmentID === ID).expires;
        const duration = findPunishmentID.warnings.find(key => key.punishmentID === ID).duration;
        const date = findPunishmentID.warnings.find(key => key.punishmentID === ID).date;
        const reason = findPunishmentID.warnings.find(key => key.punishmentID === ID).reason;

        const punishInfoEmbed = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(interaction.guild))
            .setAuthor(`Punishment information`, client.user.displayAvatarURL())
            .setDescription(`Case information for punishment ID \`${ID}\`\nType: **${type}**`)
            .addField('User Mention', user.toString())
            .addField('User Tag and ID', `**${user.tag}** - \`${user.id}\``)
            .addField('Moderator Mention', moderator.toString())
            .addField('Moderator Tag and ID', `**${moderator.tag}** - \`${moderator.id}\``)
            .addField('Punishment Reason', reason.length <= 1024 ? reason : await client.util.createBin(reason))
            .addField('Punishment Date', date);
        if (duration && (type !== 'Unmute' || type === 'Kick')) punishInfoEmbed.addField('Duration', duration);
        if (duration && (type !== 'Unmute' || type === 'Kick'))
            punishInfoEmbed.addField(
                'Expires',
                duration !== 'Permanent'
                    ? expires - Date.now() > 0
                        ? client.util.timestamp(expires)
                        : 'This punishment has already expired'
                    : 'Never'
            );

        return interaction.reply({ embeds: [punishInfoEmbed] });
    }
};
