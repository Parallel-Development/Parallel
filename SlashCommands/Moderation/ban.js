const ms = require('ms');
const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const Infraction = require('../../structures/Infraction');
const Punishment = require('../../structures/Punishment');
const warningSchema = require('../../schemas/warning-schema');
const punishmentSchema = require('../../schemas/punishment-schema');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'ban',
    description: 'Bans a member from the server',
    data: new SlashCommandBuilder().setName('ban').setDescription('Bans a user from the server')
    .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(option => option.setName('duration').setDescription('The duration of the ban'))
    .addStringOption(option => option.setName('reason').setDescription('The reason for banning the user')),
    permissions: Discord.Permissions.FLAGS.BAN_MEMBERS,
    requiredBotPermission: Discord.Permissions.FLAGS.BAN_MEMBERS,
    async execute(client, interaction, args) {

        const member = await client.util.getMember(interaction.guild, args['user']) || await client.util.getUser(client, args['user']);
        if (!member) return client.util.throwError(interaction, client.config.errors.invalid_member);

        const alreadyBanned = await interaction.guild.bans.fetch().then(bans => bans.find(ban => ban.user.id === member.id));
        if (alreadyBanned) return client.util.throwError(interaction, 'This user is already banned')

        const time = args['duration'] ? ms(args['duration']) : null
        if (time && time > 315576000000) return client.util.throwError(interaction, client.config.errors.time_too_long);
        const reason = args['reason'] || 'Unspecified';

        if (member.user) {
            if (member.id === client.user.id) return client.util.throwError(interaction, client.config.errors.cannot_punish_myself);
            if (member.id === interaction.member.id) return client.util.throwError(interaction, client.config.errors.cannot_punish_yourself);
            if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.member.id !== interaction.guild.ownerId) return client.util.throwError(interaction, client.config.errors.hierarchy);
            if (member.roles.highest.position >= interaction.guild.me.roles.highest.position) return client.util.throwError(interaction, client.config.errors.my_hierarchy);
            if (member.id === interaction.guild.ownerId) return client.util.throwError(interaction, client.config.errors.cannot_punish_owner)
        };

        const punishmentID = client.util.generateID();

        const settings = await settingsSchema.findOne({
            guildID: interaction.guild.id
        })
        const { baninfo } = settings;
        const { delModCmds } = settings;

        const guildWarnings = await warningSchema.findOne({ guildID: interaction.guild.id });
        const bansToExpire = guildWarnings.warnings.filter(warning => warning.expires > Date.now() && warning.type === 'Ban');
        for (let i = 0; i !== bansToExpire.length; ++i) {
            const ban = bansToExpire[i];
            await warningSchema.updateOne({
            guildID: interaction.guild.id,
            warnings: {
                $elemMatch: {
                    punishmentID: ban.punishmentID
                }
            }
            },
            {
                $set: {
                    "warnings.$.expires": Date.now()
                }
            })
        }

        await punishmentSchema.deleteMany({
            guildID: interaction.guild.id,
            type: 'ban',
            userID: member.id
        })

        
        if (member.user) await new DMUserInfraction(client, 'banned', client.config.colors.punishment[2], interaction, member, { reason: reason, punishmentID: punishmentID, time: time, baninfo: baninfo !== 'none' ? baninfo : null });

        new ModerationLogger(client, 'Banned', interaction.member, member, interaction.channel, { reason: reason, duration: time, punishmentID: punishmentID});

        await interaction.guild.members.ban(member, { reason: reason });

        new Infraction(client, 'Ban', interaction, interaction.member, member, { reason: reason, punishmentID: punishmentID, time: time, auto: false });
        if (time) new Punishment(interaction.guild.name, interaction.guild.id, 'ban', member.id, { reason: reason, time: time ? Date.now() + time : 'Never' });

        const banEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.punishment[2])
        .setDescription(`✅ **${member.user ? member : member.tag}** has been banned with ID \`${punishmentID}\``);

        if (delModCmds) {
            await interaction.reply({ content: `Successfully banned member ${member}`, ephemeral: true });
            return interaction.channel.send({ embeds: [banEmbed] });
        }

        return interaction.reply({ embeds: [banEmbed] });s

    }
}