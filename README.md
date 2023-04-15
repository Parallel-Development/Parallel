# Parallel
A moderation Discord bot

## Dependencies
- `Node`
- `Postgresql Server`
- `NPX or prisma installed locally`
- `TypeScript`

## Enviornment Variables
Create a `.env` file and paste below into it. Replace the placeholders with something valid.
- `TOKEN`={Discord bot token}
- `CLIENT_ID`={Discord client ID}
- `DATABASE_URL`={Postgresql connect url}

## Starting the Bot (For the First Time)
Not required for starting, but recommended for personalization, replace all instances of `Parallel` in the `src` files with your bot's name.

1. Ensure all environment variables (listed above) are defined in a `.env` file
2. Install all dependencies. With npm, run `npm install`. With yarn, run `yarn install`.
3. Ensure the `prisma/schema.prisma` file matches the structure of your database. If not, run `npx prisma db push`.
If it already does, ensure that the client has been generated. Upon running `npx prisma db push` it automatically generates, but
by running `npx prisma generate` you can generate the client locally.
4. To build the source files, run `npm run build` or `tsc`
5. Run `node deploy.js` to push all slash commands to the bot
6. To then run the compiled js files, run `npm run start` or `node .` or `node dist/index.js`

After all of the steps above have been completed, for running future times, only the last step will have to be executed to start the bot.