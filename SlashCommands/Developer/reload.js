const fs = require('fs');
const commandFolders = fs.readdirSync('./SlashCommands');
const path = require('path');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'reload',
    description: 'A command that can reload other commands!',
    usage: 'reload <directory> <file_name>',
    developer: true,
    data: new SlashCommandBuilder().setName('reload').setDescription('Reload all commands'),
    async execute(client, interaction, args) {
        await interaction.deferReply();

        for (const folder of commandFolders) {
            const commandFiles = fs.readdirSync(`./SlashCommands/${folder}`).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                try {
                    delete require.cache[require.resolve(`../${folder}/${file}`)];
                    client.slashCommands.delete(path.parse(file).name);
                    const pull = require(`../${folder}/${file}`);
                    client.slashCommands.set(path.parse(file).name, pull);
                } catch (e) {
                    interaction.followUp(`Could not reload: \`${folder}/${file}\``);
                }
            }
        }

        return interaction.editReply(`All slash commands have been reloaded!`);
    }
};
