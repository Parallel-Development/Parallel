const Discord = require('discord.js');
const fs = require('fs')
const path = require('path')
const commandFolders = fs.readdirSync('./SlashCommands')
const settingsSchema = require('../../schemas/settings-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'help',
    description: 'Get a list of all commands or get help on a specific command',
    data: new SlashCommandBuilder().setName('help').setDescription('Get a list of all commands or get help on a specific command')
    .addStringOption(option => option.setName('command').setDescription('The specific command to get help on')),
    async execute(client, interaction, args) {

        const settings = await settingsSchema.findOne({
            guildID: interaction.guild.id
        })
        const { shortcutCommands, modRoles } = settings;

        if (args['command']) {
            return getCMD(client, interaction, args['command'], shortcutCommands, modRoles);
        } else {
            return getAll(client, interaction, '/', shortcutCommands, modRoles);
        }
    }
}

async function getAll(client, interaction, prefix, shortcutCommands, modRoles) {


    const mainHelp = new Discord.MessageEmbed()
    .setColor(client.config.colors.main)
    .setAuthor('Help | Parallel', client.user.displayAvatarURL())
    .setFooter(`To get specific information about a command, run ${prefix}help <command>`)

    for (const folder of commandFolders) {
        const commands = []
        const commandFiles = fs.readdirSync(`./SlashCommands/${folder}`).filter(file => file.endsWith('.js'))
        for (const file of commandFiles) {
            const cmd = client.slashCommands.get(path.parse(file).name);
            if (cmd.developer && client.config.developers.includes(interaction.user.id)) commands.push(`\`${path.parse(file).name}\``)
            else if (!cmd.developer && !cmd.hidden) commands.push(`\`${path.parse(file).name}\``);
        }
        if (commands.length !== 0) mainHelp.addField(folder, commands.join(', '))
    }
    if (shortcutCommands.length && (interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) || interaction.member.roles.cache.some(role => modRoles.includes(role)))) {
        const scommands = [];
        for (const command of shortcutCommands) scommands.push(`\`${command.name}\``);
        mainHelp.addField('This server\'s shortcuts', scommands.join(', '))
    }

    const linkInviteLink = new Discord.MessageButton().setLabel('Invite Link').setStyle('LINK').setURL('https://discord.com/api/oauth2/authorize?client_id=745401642664460319&permissions=2617568510&scope=bot%20applications.commands');
    const linkSupportServer = new Discord.MessageButton().setLabel('Support Server').setStyle('LINK').setURL('https://discord.gg/v2AV3XtnBM');
    const linkDocumentation = new Discord.MessageButton().setLabel('Documentation').setStyle('LINK').setURL('https://piyeris0.gitbook.io/parallel/');
    const linkBotGuidelines = new Discord.MessageButton().setLabel('Bot Guidelines').setStyle('LINK').setURL('https://docs.google.com/document/d/1u0Z6WVS0V8D72E8cU5gUw2OwGeqW3g1OvwSkzG7odOw/edit');
    const linkPrivacyPolicy = new Discord.MessageButton().setLabel('Privacy Policy').setStyle('LINK').setURL('https://docs.google.com/document/d/1-dkGO89cDY_GeKzjKj9SMAVm8SbSvdOZlMK3WLZ6kIs/edit');

    const buttons = new Discord.MessageActionRow().addComponents(
        linkInviteLink, linkSupportServer, linkDocumentation, linkBotGuidelines, linkPrivacyPolicy
    )

    return interaction.reply({ embeds: [mainHelp], components: [buttons] })
}

async function getCMD(client, interaction, input, shortcutCommands, modRoles) {

    const cmd = client.slashCommands.get(input.toLowerCase()) || client.slashCommands.get(client.aliases.get(input.toLowerCase()));

    if (shortcutCommands.length && shortcutCommands.some(command => command.name === input && (interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) || interaction.member.roles.cache.some(role => modRoles.includes(role))))) {
        const scmd = shortcutCommands.find(command => command.name === input);
        const sembed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        if (scmd.name) sembed.setAuthor(`Help | ${scmd.name}`, client.user.displayAvatarURL())
        if (scmd.type) sembed.addField('Punishment Type', scmd.type.replace('temp', '')[0].toUpperCase() + scmd.type.replace('temp', '').slice(1))
        if (scmd.reason) sembed.addField('Punishment Reason', scmd.reason.length >= 1024 ? await client.util.createBin(scmd.reason) : scmd.reason)
        if (scmd.duration && scmd.duration !== 'Permanent') sembed.addField('Punishment Duration', `${client.util.duration(scmd.duration)}`)

        return interaction.reply({ embeds: [sembed] });
    }

    const embed = new Discord.MessageEmbed();
    if (!cmd || cmd.developer && !client.config.developers.includes(interaction.user.id) || cmd.hidden) {
        embed.setColor(client.config.colors.err)
        .setDescription(`No information found for the provided command`);
        return interaction.reply({ embeds: [embed] });
    }

    embed.setColor(client.config.colors.main)
    if (cmd.name) embed.setAuthor(`Help | ${cmd.name}`, client.user.displayAvatarURL())
    if (cmd.description) embed.addField('Description', cmd.description)


    return interaction.reply({ embeds: [embed] });
}
