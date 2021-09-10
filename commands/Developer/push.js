const Discord = require('discord.js');
const { exec } = require('child_process')

module.exports = {
    name: 'push',
    description: 'Push ALL changes to github',
    usage: 'push [message]',
    aliases: ['push-it'],
    async execute(client, message, args) {
        const commitMessage = args.join(' ') || 'No specified reason';
        const msg = await message.channel.send(`Pushing changes to github...`);
        await exec(`git add ../..; git commit -m ${commitMessage}; git push origin master`);
        await msg.edit(`Successfully pushed all changes to git with message: ${commitMessage}`)
    }
}