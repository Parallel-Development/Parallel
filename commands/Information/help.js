const Discord = require('discord.js')
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
        const { prefix, shortcutCommands } = settings;

        if (args[0]) {
            return getCMD(client, message, args[0], shortcutCommands);
        } else {
            return getAll(client, message, prefix, shortcutCommands);
        }
    }
}

async function getAll(client, message, prefix, shortcutCommands) {


    const mainHelp = new Discord.MessageEmbed()
    .setColor(client.config.colors.main)
    .setAuthor('Help | Parallel', client.user.displayAvatarURL())
    .setFooter(`To get specific information about a command, run ${prefix}help <command>`)

    for (const folder of commandFolders) {
        const commands = []
        const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'))
        for (const file of commandFiles) {
            const cmd = client.commands.get(path.parse(file).name);
            if (cmd.developer && client.config.developers.includes(message.author.id)) commands.push(`\`${path.parse(file).name}\``)
            else if (!cmd.developer) commands.push(`\`${path.parse(file).name}\``);
        }
        if (commands.length !== 0) mainHelp.addField(folder, commands.join(', '))
    }
    if(shortcutCommands.length) {
        const scommands = [];
        for(const command of shortcutCommands) scommands.push(`\`${command.name}\``);
        mainHelp.addField('Shortcuts', scommands.join(', '))
    }

    mainHelp.addField('Links', `[Invite Link](https://discord.com/oauth2/authorize?client_id=745401642664460319&permissions=8&scope=bot) | [Support/Development Server](https://discord.gg/DcmVMPx8bn) | [Bot Guidelines](https://docs.google.com/document/d/1u0Z6WVS0V8D72E8cU5gUw2OwGeqW3g1OvwSkzG7odOw/edit) | [Privacy Policy](https://docs.google.com/document/d/1-dkGO89cDY_GeKzjKj9SMAVm8SbSvdOZlMK3WLZ6kIs/edit)`)
    return message.reply({ embeds: [mainHelp] })
}

async function getCMD(client, message, input, shortcutCommands) {

    const cmd = client.commands.get(input.toLowerCase()) || client.commands.get(client.aliases.get(input.toLowerCase()));

    if(shortcutCommands.length && shortcutCommands.some(command => command.name === input)) {
        const scmd = shortcutCommands.find(command => command.name === input);
        const sembed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        if (scmd.name) sembed.setAuthor(`Help | ${scmd.name}`, client.user.displayAvatarURL())
        if(scmd.type) sembed.addField('Punishment Type', scmd.type)
        if (scmd.reason) sembed.addField('Punishment Reason', scmd.reason.length >= 1500 ? await client.util.createBin(scmd.reason) : scmd.reason)
        if (scmd.duration && scmd.duration !== 'Permanent') sembed.addField('Punishment Duration', `${client.util.convertMillisecondsToDuration(scmd.duration)}`)

        return message.reply({ embeds: [sembed] });
    }

    const embed = new Discord.MessageEmbed();
    if (!cmd || cmd.developer && !client.config.developers.includes(message.author.id)) {
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