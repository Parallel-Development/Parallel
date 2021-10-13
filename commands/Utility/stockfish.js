const Discord = require('discord.js');
const { chessAnalysisApi } = require('chess-analysis-api');
const chess = require('chess.js').Chess();

module.exports = {
    name: 'stockfish',
    description: 'Using the chess engine stockfish, generate the next move',
    usage: 'chess [FEN]',
    async execute(client, message, args) {

        const FEN = args.join(' ');
        if(!FEN) return client.util.throwError(message, 'a FEN is required')

        let stop = false;

        const isPossibleFEN = chess.load(FEN);
        if(!isPossibleFEN) return message.reply('Invalid FEN! Is the position impossible? Is the position a draw?');
        if (chess.moves().every(move => move.endsWith('#'))) return message.reply('Invalid FEN! Is the position impossible? Is the position a draw?')

        const msg = await message.reply('Calculating...');
        const result = await chessAnalysisApi.getAnalysis({
            fen: FEN,
            depth: 20,
            multipv: 1
        }).catch(() => { msg.edit('Invalid FEN! Is the position impossible? Is the position a draw?'); stop = true; });

        if(stop) return;

        if(!result) return msg.edit('A reuslt could not be generated')

        const uci = result.moves[0].uci;
        const score = result.moves[0].score;
        let nextMove = Array.isArray(uci) ? uci[0] : uci;
        if(result.type === 'opening') nextMove = result.moves[0].uci;

        const analysisEmbed = new Discord.MessageEmbed()
        .setColor(FEN.split(' ')[1] === 'b' ? null : '#FFFFFF')
        .setAuthor('Stockfish Analysis', client.user.displayAvatarURL())
        .setTitle(`${FEN.split(' ')[1] === 'b' ? 'Black' : 'White'} to move`)
        .setDescription(`Move \`${nextMove.slice(0, 2)}\` to \`${nextMove.slice(2, 4)}\`${Array.isArray(uci) ? `\n\n...${uci.map(move => `\`${move}\``).join(' ')}` : ''}${score?.type === 'mate' ? `\n\nForced checkmate for ${score.value < 0 ? 'black' : 'white'} in ${Math.abs(score.value)} ${Math.abs(score.value) === 1 ? 'move' : 'moves'}` : score?.value ? `\n\nScore: \`${score.value / 100 > 0 ? `+${(score.value / 100)}` : score.value / 100}\` - ${score.value > 0 ? 'white is doing better in this position' : 'black is doing better in this position'}` : ''}${result.opening ? `\n\nPlaying opening \`${result.opening.name}\`` : ''}`)

        msg.delete();
        return message.channel.send({ embeds: [analysisEmbed] });
    }
}