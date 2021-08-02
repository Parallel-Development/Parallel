const fs = require('fs');
const commandFolders = fs.readdirSync('./commands')
const path = require('path')

module.exports =  {
    name: 'reload',
    description: "A command that can reload other commands!",
    usage: 'reload <directory> <file_name>',
    async execute(client, message, args) {

        const config = require("../../config.json");
        if(!client.config.developers.includes(message.author.id)) return message.channel.send("Sorry, you can't run that!")
  
        const directory = args[0];
        const fileName = args[1]

        if(!directory) return message.channel.send('A directory name must be provided')
        if(!fileName && directory !== '-all') return message.channel.send('A file name must be provided')
        
        const commandPath = `./${directory}/${fileName}`

        if(args[0] === "-all") {

            const msg = await message.channel.send('Reloading...')
            for (const folder of commandFolders) {
                const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'))
                for (const file of commandFiles) {
                    try {
                        delete require.cache[require.resolve(`../${folder}/${file}`)]
                        client.commands.delete(path.parse(file).name)
                        const pull = require(`../${folder}/${file}`)
                        client.commands.set(path.parse(file).name, pull)
                    } catch (e) {
                        message.channel.send(`Could not reload: \`${folder}/${file}\``)
                    }
                }

            }

            return await msg.edit(`All commands have been reloaded!`)
        }

        try {
            delete require.cache[require.resolve(`../${commandPath}.js`)]
            client.commands.delete(fileName)
            const pull = require(`../${commandPath}.js`)
            client.commands.set(fileName, pull)
        } catch(e) {
            return message.channel.send(`Could not reload: \`${commandPath}\``)
        }
        message.channel.send(`The file \`${commandPath}\` has been reloaded!`)
    }
  }