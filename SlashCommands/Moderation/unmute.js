const Discord = require('discord.js');
const punishmentSchema = require('../../schemas/punishment-schema');
const settingsSchema = require('../../schemas/settings-schema');

const ModerationLogger = require('../../structures/ModerationLogger');
const DMUserInfraction = require('../../structures/DMUserInfraction');
const Infraction = require('../../structures/Infraction');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'unmute',
    description: 'Unmutes a member allowing them to speak in the server',
    data: new SlashCommandBuilder().setName('unmute').setDescription('Unutes a member allowing them to speak in the server')
    .addUserOption(option => option.setName('user').setDescription('The user to unmute').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for muting the user')),
    permissions: Discord.Permissions.FLAGS.MANAGE_ROLES,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_ROLES,
    aliases: ['unshut', 'um'],
    async execute(client, interaction, args) {

        const reason = args['reason'] || 'Unspecified';
        const punishmentID = client.util.generateID();

        const settings = await settingsSchema.findOne({
            guildID: interaction.guild.id
        })
        const { delModCmds } = settings;

        const member = await client.util.getMember(interaction.guild, args['user'])
        if (!member) {
            const user = await client.util.getUser(client, args['user'])

            let hasMuteRecord = await punishmentSchema.findOne({
                guildID: interaction.guild.id,
                userID: user.id,
                type: 'mute'
            })

            if (!hasMuteRecord) return client.util.throwError(interaction, 'This user is not currently muted');
            if (delModCmds) interaction.delete();

            new Infraction(client, 'Unmute', interaction, interaction.member, user, { reason: reason, punishmentID: punishmentID, time: null, auto: false });
            new ModerationLogger(client, 'Unmuted', interaction.member, user, interaction.channel, { reason: reason, duration: null, punishmentID: punishmentID });

            await punishmentSchema.deleteMany({
                guildID: interaction.guild.id,
                userID: user.id,
                type: 'mute'
            })

            return interaction.reply(`**${user.tag}** has been unmuted. They are not currently on this server`)

        }
        if (!member) return client.util.throwError(interaction, client.config.errors.invalid_member);

        const { muterole, removerolesonmute } = settings;
        const role = interaction.guild.roles.cache.get(muterole);

        if (!role) return client.util.throwError(interaction, 'The muted role does not exist');
        if (role.position >= interaction.guild.me.roles.highest.position) return client.util.throwError(interaction, client.config.errors.my_hierarchy);

        let hasMuteRecord = await punishmentSchema.findOne({
            guildID: interaction.guild.id,
            userID: member.id,
            type: 'mute'
        })

        const rolesToAdd = hasMuteRecord?.roles?.filter(role => interaction.guild.roles.cache.get(role) && !(role.managed && !member.roles.cache.has(role)) && interaction.guild.roles.cache.get(role).position < interaction.guild.me.roles.highest.position)
        if (removerolesonmute && hasMuteRecord?.roles?.length) await member.roles.set(rolesToAdd);
        else member.roles.remove(role);

        if (!member.roles.cache.has(role.id) && !hasMuteRecord) return client.util.throwError(interaction, 'This user is not currently muted');

        await punishmentSchema.deleteMany({
            guildID: interaction.guild.id,
            userID: member.id,
            type: 'mute'
        });


        new Infraction(client, 'Unmute', interaction, interaction.member, member, { reason: reason, punishmentID: punishmentID, time: null, auto: false });
        new DMUserInfraction(client, 'unmuted', client.config.colors.main, interaction, member, { reason: reason, time: 'ignore', punishmentID: 'ignore' });
        new ModerationLogger(client, 'Unmuted', interaction.member, member, interaction.channel, { reason: reason, duration: null, punishmentID: punishmentID });

        const unmutedEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`✅ ${member.toString()} has been unmuted`)
        
        if(delModCmds) {
            await interaction.reply({ content: `Successfully unmuted member ${member}`, ephemeral: true });
            return interaction.channel.send({ embeds: [unmutedEmbed] });
        }

        return interaction.reply({ embeds: [unmutedEmbed] });
        
    }
}