const Discord = require('discord.js');
const { chessAnalysisApi } = require('chess-analysis-api');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'stockfish',
    description: 'Get an analysis of a FEN position with the chess engine stockfish',
    data: new SlashCommandBuilder().setName('stockfish').setDescription('Get an analysis of a FEN position with the chess engine stockfish')
    .addStringOption(option => option.setName('fen').setDescription('The FEN notation of the position').setRequired(true)),
    async execute(client, interaction, args) {

        const FEN = args['fen'];
        if(!FEN) return client.util.throwError(interaction, 'a FEN is required')

        let stop = false;

        await interaction.deferReply();
        const result = await chessAnalysisApi.getAnalysis({
            fen: FEN,
            depth: 20,
            multipv: 1
        }).catch(() => { interaction.editReply('Invalid FEN! Is the position impossible? Is the position a draw?'); stop = true; });

        if(stop) return;

        if(!result) return interaction.editReply('A reuslt could not be generated')

        const uci = result.moves[0].uci;
        const score = result.moves[0].score;
        let nextMove = Array.isArray(uci) ? uci[0] : uci;
        if(result.type === 'opening') nextMove = result.moves[0].uci;

        const analysisEmbed = new Discord.MessageEmbed()
        .setColor(FEN.split(' ')[1] === 'b' ? null : '#FFFFFF')
        .setAuthor('Stockfish Analysis', client.user.displayAvatarURL())
        .setTitle(`${FEN.split(' ')[1] === 'b' ? 'Black' : 'White'} to move`)
        .setDescription(`Move \`${nextMove.slice(0, 2)}\` to \`${nextMove.slice(2, 4)}\`${Array.isArray(uci) ? `\n\n...${uci.map(move => `\`${move}\``).join(' ')}` : ''}${score?.type === 'mate' ? `\n\nForced checkmate for ${score.value < 0 ? 'black' : 'white'} in ${Math.abs(score.value)} ${Math.abs(score.value) === 1 ? 'move' : 'moves'}` : score?.value ? `\n\nScore: \`${score.value / 100 > 0 ? `+${(score.value / 100)}` : score.value / 100}\` - ${score.value > 0 ? 'white is doing better in this position' : 'black is doing better in this position'}` : ''}${result.opening ? `\n\nPlaying opening \`${result.opening.name}\`` : ''}`)

        return interaction.editReply({ embeds: [analysisEmbed] });
    }
}