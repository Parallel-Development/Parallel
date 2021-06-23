const Discord = require('discord.js')
const ytdl = require('ytdl-core')
const search = require('youtube-search')
const config = require('../../config.json')

module.exports = {
    name: 'play',
    description: 'Searches youtube for your query and plays the first result in a voice channel',
    usage: 'play <query>',
    aliases: ['p'],
    async execute(client, message, args, ops) {

        return message.channel.send('Hello, unfortunately we are experiencing issues with Music right now, so Music has been temporarily disabled')

        client.on('voiceStateUpdate', (oldState, newState) => {

            if (oldState.channelID !== oldState.guild.me.voice.channelID || newState.channel)
              return;
            
            if (newState.channel.members.filter(m => m.user.bot == false).size == 0)
              return setTimeout(() => {
                if (newState.channel.members.filter(m => m.user.bot == false).size == 0) 
                 newState.channel.leave(); // leave
              }, 60000);
          });

        const opts = {
            maxResults: 5,
            key: config.youtubeapi,
            type: 'video'
        }

        const notinVC = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You must be in a voice channel to play music! Please join a voice channel and try again')
            .setAuthor('Error', client.user.displayAvatarURL())

        const nosong = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('Please specify a query to play')
            .setAuthor('Error', client.user.displayAvatarURL())

        const botnotinVC = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I am not currently in this voice channel!')

        if (!message.member.voice.channel) return message.channel.send(notinVC)
        if (message.guild.me.voice.channel && message.guild.me.voice.channel.id !== message.member.voice.channel.id) {
            return message.channel.send(botnotinVC)
        }
        if (!args.join(' ')) return message.channel.send(nosong)

        let results = await search(args.join(' '), opts).catch(err => console.log(err));

        let youtubeResults;
        let selected;
        if (results) {
            youtubeResults = results.results

            selected = youtubeResults[0]

            if (!selected) {
                const noResultsFound = new Discord.MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('No results found')
                    .setDescription(`Your search was not found`)
                message.channel.send(noResultsFound)
                return;
            }
        }

        let validate = await ytdl.validateURL(selected.link)
        let info = await ytdl.getInfo(selected.link)
        let data = ops.active.get(message.guild.id) || {};

        if (!data.connection) {
            data.connection = await message.member.voice.channel.join().catch(() => { return message.chanenl.send('Failed to join the Voice Channel. Do I have the permission to join?') });
            message.guild.me.voice.setDeaf(true).catch(() => { return })
        }
        if (!data.queue) data.queue = [];
        data.guildID = message.guild.id;
        data.queue.push({
            songTitle: selected.title,
            songURL: selected.link,
            requester: message.author.tag,
            url: selected.link,
            announceChannel: message.channel.id
        })
        if (!data.dispatcher) play(client, ops, data);
        else {
            const addedToQueue = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setDescription(`<:youtube:800062024771305553> Added to Queue: [${selected.title}](${selected.link}) | Requested by: **${message.author.tag}**`)

            message.channel.send(addedToQueue)
        }

        ops.active.set(message.guild.id, data);
    }

}

async function play(client, ops, data) {
    const nowplaying = new Discord.MessageEmbed()
    .setColor('#09fff2')
    .setDescription(`<:youtube:800062024771305553> Now playing: [${data.queue[0].songTitle}](${data.queue[0].songURL}) | Requested by: **${data.queue[0].requester}**`)
    client.channels.cache.get(data.queue[0].announceChannel).send(nowplaying)

    data.dispatcher = await data.connection.play(ytdl(data.queue[0].songURL), { filter: 'audioonly '})
    data.dispatcher.guildID = data.guildID;

    data.dispatcher.once('finish', function() {
        finish(client, ops, this);
    })
}

function finish(client, ops, dispatcher) {
    let fetched = ops.active.get(dispatcher.guildID)
    fetched.queue.shift();
    if(fetched.queue.length > 0) {
        ops.active.set(dispatcher.guildID, fetched);
        play(client, ops, fetched);
    } else {
        // ops.active.delete(dispatcher.guildID)
        // let vc = client.guilds.cache.get(dispatcher.guildID).me.voice.channel;
        // if(vc) vc.leave();

    }
}
