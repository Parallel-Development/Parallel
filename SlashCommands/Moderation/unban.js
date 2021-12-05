const Discord = require('discord.js');
const Infraction = require('../../structures/Infraction');
const ModerationLogger = require('../../structures/ModerationLogger');
const punishmentSchema = require('../../schemas/punishment-schema');
const warningSchema = require('../../schemas/warning-schema');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'unban',
    description: 'Unban a member from the server',
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a member from the server')
        .addUserOption(option => option.setName('user').setDescription('The user to unban').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('The reason for unbanning the user')),
    permissions: Discord.Permissions.FLAGS.BAN_MEMBERS,
    requiredBotPermission: Discord.Permissions.FLAGS.BAN_MEMBERS,
    async execute(client, interaction, args) {
        const user = await client.util.getUser(client, args['user']);
        if (!user) return client.util.throwError(interaction, client.config.errors.invalid_user);

        const reason = args['reason'] || 'Unspecified';

        const userBanned = await interaction.guild.bans.fetch(user.id).catch(() => {});
        if (!userBanned) return client.util.throwError(interaction, 'This user is not banned');

        await interaction.guild.members.unban(user.id);

        await punishmentSchema.deleteMany({
            guildID: interaction.guild.id,
            userID: user.id,
            type: 'ban'
        });

        const guildWarnings = await warningSchema.findOne({ guildID: interaction.guild.id });

        if (guildWarnings?.warnings?.length) {
            const bansToExpire = guildWarnings.warnings.filter(
                warning => warning.expires > Date.now() && warning.type === 'Ban' && warning.userID === user.id
            );
            for (let i = 0; i !== bansToExpire.length; ++i) {
                const ban = bansToExpire[i];
                await warningSchema.updateOne(
                    {
                        guildID: interaction.guild.id,
                        warnings: {
                            $elemMatch: {
                                punishmentID: ban.punishmentID
                            }
                        }
                    },
                    {
                        $set: {
                            'warnings.$.expires': Date.now()
                        }
                    }
                );
            }
        }

        const punishmentID = client.util.createSnowflake();

        new Infraction(client, 'Unban', interaction, interaction.member, user, {
            reason: reason,
            punishmentID: punishmentID,
            time: null,
            auto: false
        });
        new ModerationLogger(client, 'Unbanned', interaction.member, user, interaction.channel, {
            reason: reason,
            duration: null,
            punishmentID: punishmentID
        });

        const unbannedEmbed = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(interaction.guild))
            .setDescription(`✅ **${user.tag}** has been unbanned`);

        return interaction.reply({ embeds: [unbannedEmbed] });
    }
};
