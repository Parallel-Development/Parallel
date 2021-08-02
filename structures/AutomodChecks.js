const automod = require('./Automod');
const automodSchema = require('../schemas/automod-schema');
const userMap = new Map();

exports.run = async(client, message, edit = false) => {

    const automodSettings = await automodSchema.findOne({ 
        guildID: message.guild.id
    })

    // Filter Check;

    const { filterList } = automodSettings;
    const words = message.content.split(' ');

    for (var i = 0; i !== filterList.length; ++i) {
        const filteredWord = filterList[i];
        for(var i = 0; i !== words.length; ++i) {
            let word = words[i];
            if(word === filteredWord) {
                automod.run(client, message, 'filter')
                break;
            }
        }

    };

    // Mass Mention

    if (!edit && message.mentions.users.filter(user => !user.bot).size >= 5) return automod.run(client, message, 'massmention')

    // Walltext

    const walltextCheck = message.content.split('\n')
    if (walltextCheck.length >= 9 || message.content.length >= 700) automod.run(client, message, 'wallext')

    // Spam

    if(!edit) {
        if (userMap.has(message.author.id)) {
            const userData = userMap.get(message.author.id)
            let msgCount = userData.msgCount
            if (parseInt(msgCount) === 5) {
                userMap.delete(message.author.id);
                automod.run(client, message, 'fast');
            } else {
                msgCount++
                userData.msgCount = msgCount;
                userMap.set(message.author.id, userData)
            }
        } else {
            userMap.set(message.author.id, {
                msgCount: 1,
                lastMessage: message,
                timer: null
            })
            setTimeout(() => {
                userMap.delete(message.author.id)
            }, 4000)
        }
    }

    // Invites

    const inviteCheck = new RegExp('(discord|d|dis|discordapp)(.gg|.com\/invite)/[a-zA-Z0-9]+$\\gm');
    if (inviteCheck.test(message.content)) automod.run(client, message, 'invites')

    // Links

    const linkRegex = /[a-zA-Z0-9]\.(com|net|org|edu|gov|info|schlobal|lol|wtf|xyz|ly|link|tk|io|sales|gift|gg|sh)/
    for(var i = 0; i !== words.length; ++i) {
        let word = words[i];
        if(
            word.startsWith('https://tenor.com') ||
            word.startsWith('http://tenor.com') ||
            word.startsWith('http://www.tenor.com') ||
            word.startsWith('https://www.tenor.com') ||
            word.startsWith('tenor.com') ||
            word.startsWith('www.tenor.com')
        ) {
            const { allowTenor } = automodSettings;
            if(allowTenor.enabled) {
                if(allowTenor.attachmentPermsOnly && !message.member.hasPermission('ATTACH_FILES')) return automod.run(client, message, 'links')
                else return;
            } else if (linkRegex.test(word)) return automod.run(client, message, 'links');
        } else {
            if (linkRegex.test(word)) return automod.run(client, message, 'links');
        }
    }

}