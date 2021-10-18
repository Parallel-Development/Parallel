module.exports = {
    name: 'void',
    description:
        'Set the bot into an unresponsive state to everyone else except developers. The bot will still execute functions such as unmuting or unbanning users',
    usage: 'void',
    developer: true,
    async execute(client, message, args) {
        if (global.void) {
            global.void = false;
            await message.reply('Parallel is no longer in void mode');
        } else {
            global.void = true;
            await message.reply('Parallel is now in void mode!');
        }
    }
};
