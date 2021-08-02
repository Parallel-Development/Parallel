const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
client.config = require('./config.json');
client.util = require('./structures/Utils');
client.commands = new Discord.Collection();
client.events = new Discord.Collection();
client.aliases = new Discord.Collection();
client.categories = fs.readdirSync('./commands');

const warningSchema = require('./schemas/warning-schema');
const settingsSchema = require('./schemas/settings-schema');
const muteSchema = require('./schemas/mute-schema');
const punishmentSchema = require('./schemas/punishment-schema');

const mongo = require('./mongo');
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
const commandFolders = fs.readdirSync('./commands')

const connectToMongoDB = async () => {
    await mongo().then(async (mongoose) => {
        console.log('Connected to mongoDB!');
    })
}

connectToMongoDB();

setInterval(async () => {

    // Check for expired punishments

    const currentDate = Date.now();
    const expiredDate = await punishmentSchema.find({
        expires: { $lte: currentDate },
    })

    for (const expired of expiredDate) {
        const { expires, type, userID, guildID, _id } = expired;

        if(expires === 'Never') return;

        if (type === 'mute') {
            await punishmentSchema.deleteOne({
                _id: _id,
            })

            const server = client.guilds.cache.get(guildID)
            if (!server) return;

            const role = server.roles.cache.find(r => r.name === 'Muted')
            if (!role) return;

            const member = await server.members.fetch(userID);

            if (member) member.roles.remove(role).catch(() => { return }) 

            await muteSchema.deleteMany({
                guildID: server.id,
                userid: userID
            })

            const unmutedm = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setAuthor('You were unmuted', client.user.displayAvatarURL())
                .setTitle(`You were unmuted in ${server.name}`)
                .addField('Reason', '[AUTO] Mute expired')

            if (member) member.send(unmutedm).catch(() => { return })

            require('./structures/ExpiredLogger').run(client, 'Unmuted', server, await client.users.fetch(userID), '[AUTO] Mute Expired')

        }

        if (type === 'ban') {

            await punishmentSchema.deleteOne({
                _id: _id
            })

            const server = await client.guilds.fetch(guildID)

            server.members.unban(userID).catch(() => { return })

            require('./structures/ExpiredLogger').run(client, 'Unbannned', server, await client.users.fetch(userID), '[AUTO] Ban Expired')
        }

    }

    // Check for expired warnings

    const expiredWarningDate = await warningSchema.find({
        warnings: {
            $elemMatch: {
                expires: { $lte: currentDate },
                type: 'Warn'
            }
        }
    })

    for (var i = 0; i !== expiredWarningDate.length; ++i) {
        let { _id } = expiredWarningDate[i]

        await warningSchema.updateOne({
            _id: _id
        },
            {
                $pull: {
                    warnings: {
                        expires: {
                            $lte: currentDate
                        }
                    }
                }
            })
    }

}, 5000)



for (var i = 0; i !== eventFiles.length; ++i) {
    const event = require(`./events/${eventFiles[i]}`)
    if (event.once) client.once(event.name, (...args) => event.execute(client, ...args));
    else client.on(event.name, (...args) => event.execute(client, ...args));
}

for (var folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`)
    for (var i = 0; i !== commandFiles.filter(file => file.endsWith('.js')).length; ++i) {
        const file = commandFiles[i];
        const command = require(`./commands/${folder}/${file}`)
        client.commands.set(command.name, command);
        if (command.aliases) {
            command.aliases.forEach(alias => { client.aliases.set(alias, command.name)})
        }
    }
}

client.login(client.config.token);