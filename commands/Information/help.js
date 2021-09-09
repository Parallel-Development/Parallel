const Discord = require('discord.js');
const fs = require('fs')
const path = require('path')
const commandFolders = fs.readdirSync('./commands')
const settingsSchema = require('../../schemas/settings-schema');

module.exports = {
    name: 'help',
    description: 'Provides help on commands',
    usage: 'help\nhelp [command]',
    aliases: ['commands'],
    async execute(client, message, args) {

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        })
        const { prefix, shortcutCommands, modRoles } = settings;

        if (args[0]) {
            return getCMD(client, message, args[0], shortcutCommands, modRoles);
        } else {
            return getAll(client, message, prefix, shortcutCommands, modRoles);
        }
    }
}

async function getAll(client, message, prefix, shortcutCommands, modRoles) {

    const dictionary = {
        "Configuration": client.config.emotes.settings,
        "Developer": client.config.emotes.developer,
        "Fun": client.config.emotes.controller,
        "Information": client.config.emotes.information,
        "Moderation": client.config.emotes.ban,
        "Utility": '🛠️'
    }


    const mainHelp = new Discord.MessageEmbed()
    .setColor(client.config.colors.main)
    .setAuthor('Help | Parallel', client.user.displayAvatarURL())
    .setFooter(`To get specific information about a command, run ${prefix}help <command>`)

    for(const folder of commandFolders) {
        const commands = []
        const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'))
        for(const file of commandFiles) {
            const cmd = client.commands.get(path.parse(file).name);
            if (cmd.developer && client.config.developers.includes(message.author.id)) commands.push(`\`${path.parse(file).name}\``)
            else if (!cmd.developer && !cmd.hidden) commands.push(`\`${path.parse(file).name}\``);
        }
        if (commands.length !== 0) mainHelp.addField(dictionary[folder] ? dictionary[folder] + "  " + folder : folder, commands.join(', '))
    }
    if (shortcutCommands.length && (message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) || message.member.roles.cache.some(role => modRoles.includes(role)))) {
        const scommands = [];
        for(const command of shortcutCommands) scommands.push(`\`${command.name}\``);
        mainHelp.addField('This server\'s shortcuts', scommands.join(', '))
    }

    const linkInviteLink = new Discord.MessageButton().setLabel('Invite Link').setStyle('LINK').setURL('https://discord.com/oauth2/authorize?client_id=745401642664460319&scope=bot&permissions=2617568510');
    const linkSupportServer = new Discord.MessageButton().setLabel('Support Server').setStyle('LINK').setURL('https://discord.gg/v2AV3XtnBM');
    const linkDocumentation = new Discord.MessageButton().setLabel('Documentation').setStyle('LINK').setURL('https://paralleldiscordbot.gitbook.io/');
    const linkBotGuidelines = new Discord.MessageButton().setLabel('Bot Guidelines').setStyle('LINK').setURL('https://docs.google.com/document/d/1u0Z6WVS0V8D72E8cU5gUw2OwGeqW3g1OvwSkzG7odOw/edit');
    const linkPrivacyPolicy = new Discord.MessageButton().setLabel('Privacy Policy').setStyle('LINK').setURL('https://docs.google.com/document/d/1-dkGO89cDY_GeKzjKj9SMAVm8SbSvdOZlMK3WLZ6kIs/edit');

    const buttons = new Discord.MessageActionRow().addComponents(
        linkInviteLink, linkSupportServer, linkDocumentation, linkBotGuidelines, linkPrivacyPolicy
    )

    return message.reply({ embeds: [mainHelp], components: [buttons] })
}

async function getCMD(client, message, input, shortcutCommands, modRoles) {

    const cmd = client.commands.get(input.toLowerCase()) || client.commands.get(client.aliases.get(input.toLowerCase()));

    if (shortcutCommands.length && shortcutCommands.some(command => command.name === input && (message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) || message.member.roles.cache.some(role => modRoles.includes(role))))) {
        const scmd = shortcutCommands.find(command => command.name === input);
        const sembed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        if (scmd.name) sembed.setAuthor(`Help | ${scmd.name}`, client.user.displayAvatarURL())
        if (scmd.type) sembed.addField('Punishment Type', scmd.type.replace('temp', '')[0].toUpperCase() + scmd.type.replace('temp', '').slice(1))
        if (scmd.reason) sembed.addField('Punishment Reason', scmd.reason.length >= 1024 ? await client.util.createBin(scmd.reason) : scmd.reason)
        if (scmd.duration && scmd.duration !== 'Permanent') sembed.addField('Punishment Duration', `${client.util.duration(scmd.duration)}`)

        return message.reply({ embeds: [sembed] });
    }

    const embed = new Discord.MessageEmbed();
    if (!cmd || cmd.developer && !client.config.developers.includes(message.author.id) || cmd.hidden) {
        embed.setColor(client.config.colors.err)
        .setDescription(`No information found for command **${input.toLowerCase()}**`);
        return message.reply({ embeds: [embed] });
    }

    embed.setColor(client.config.colors.main)
    if (cmd.name) embed.setAuthor(`Help | ${cmd.name}`, client.user.displayAvatarURL())
    if (cmd.description) embed.addField('Description', cmd.description)
    if (cmd.usage) embed.addField('Usage', `${cmd.usage}`)
    if (cmd.aliases) embed.addField('Aliases', cmd.aliases.join(', '))


    return message.reply({ embeds: [embed] });
}
