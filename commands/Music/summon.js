const Discord = require('discord.js')
const { execute } = require('./leave')

module.exports = {
    name: 'summon',
    description: 'Summons the bot to your voice channel',
    usage: 'summon',
    aliases: ['join', 'connect'],
    async execute(client, message, args) {
        client.on('voiceStateUpdate', (oldState, newState) => {
            // if nobody left the channel in question, return.
            if (oldState.channelID !== oldState.guild.me.voice.channelID || newState.channel)
              return;
      
            // otherwise, check how many people are in the channel now
            if (!(oldState.channel.members.size - 1))
              return setTimeout(() => { // if 1 (you), wait five minutes
                if (!(oldState.channel.members.size - 1)) // if there's still 1 member, 
                  oldState.channel.leave(); // leave
              }, 5000); // (5 seconds in ms)
          });
        const notinVC = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('<:error:815355171537289257> You must be in a voice channel to run this command! Join a voice channel and try again')

        if (!message.member.voice.channel) return message.channel.send(notinVC)
        if (message.guild.me.voice.channel) return message.channel.send('I am already in a voice channel!')

        message.member.voice.channel.join().catch(() => { return message.channel.send('Failed to join the Voice Channel.Do I have the permission to join?') } );
        message.channel.send('Joined!')
    }
}