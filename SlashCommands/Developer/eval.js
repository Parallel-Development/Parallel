const Discord = require('discord.js');
const util = require('util');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'eval',
    description: 'Evaluates the specified code',
    usage: 'eval [code]\n\nFlags: `--silent`, `--delete`, `--async`',
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evaluates the specified code')
        .addStringOption(option => option.setName('code').setDescription('The code to evaluate').setRequired(true))
        .addBooleanOption(option => option.setName('async').setDescription('Run the code in an asynchronous function'))
        .addBooleanOption(option =>
            option.setName('ephemeral').setDescription('Send the response as an ephemeral message')
        ),
    developer: true,
    async execute(client, interaction, args) {
        const isAsync = args['async'];
        const ephemeral = args['ephemeral'];
        const code = args['code'];

        await interaction.deferReply({ ephemeral: ephemeral });

        let startTime;
        let endTime;

        try {
            startTime = performance.now();
            output = isAsync ? await eval(`(async() => { ${code} })()`) : await eval(code);
            initialOutput = output;
            endTime = performance.now();
            type = typeof output;
        } catch (err) {
            const _endTime = performance.now();
            const error = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setDescription(`Input: \`\`\`js\n${code}\`\`\`\nOutput: \`\`\`js\n` + err + `\`\`\``)
                .setAuthor(`Evaluation`, client.user.displayAvatarURL())
                .setTitle(`Error occurred after ${client.util.duration(_endTime - startTime)}`)
                .setFooter(`Returned error type: ${err.name}`);
            return interaction.editReply({ embeds: [error], ephemeral: ephemeral }).catch(() => {});
        }

        if (typeof output !== 'string') output = util.inspect(output, { depth: 0 });

        let outputEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`Input:\`\`\`js\n${code}\`\`\`\nOutput:\`\`\`js\n` + output + `\`\`\``)
            .setAuthor('Evaluation', client.user.displayAvatarURL())
            .setTitle(`Completed in ${client.util.duration(endTime - startTime)}`)
            .setFooter(`Return type: ${type}`);

        interaction
            .editReply({ embeds: [outputEmbed], ephemeral: ephemeral })
            .catch(async () => {
                const returned = await client.util.createBin(initialOutput);
                const _output = new Discord.MessageButton()
                    .setLabel('Returned output')
                    .setStyle('LINK')
                    .setURL(returned);

                const buttons = new Discord.MessageActionRow().addComponents(_output);

                const newOutputEmbed = new Discord.MessageEmbed()
                    .setColor(client.config.colors.main)
                    .setDescription(`Failed to send output, click the button below to view the returned output`);
                return interaction.editReply({ embeds: [newOutputEmbed], components: [buttons] });
            })
            .catch(() => {});
    }
};
