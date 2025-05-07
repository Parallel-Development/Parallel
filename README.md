# Parallel

A Discord moderation bot.

## Table of Contents

- [Dependencies](#dependencies)
- [Environment Variables](#enviornment-variables)
- [Starting the Bot (For the First Time)](#starting-the-bot-for-the-first-time)
- [Contributing](#contributing)
- [License](#license)

## Dependencies

- [Node](https://www.nodejs.org)
- [Postgresql Server](https://www.postgresql.org/download/)
- [TypeScript](https://www.npmjs.com/package/typescript) (or `npm install -g typescript`)

## Enviornment Variables

Create a `.env` file and paste below into it. Replace the placeholders with something valid.

```
TOKEN={Discord bot token}
CLIENT_ID={Discord client ID}
DEV={Developer ID} # User permitted to run eval
PREFIX={Prefix in DM's / default prefix}
DATABASE_URL={Postgresql connect url}
API={API URL}
```

## API

The API is currently only used for chat logs, which allow you to view purged messages online with styling similar to Discord.
The API source code is available at [here](https://github.com/Parallel-Development/Parallel-API). View its `README.md` for instructions on starting.
If you are unable to host the API, it is recommended that you rewrite the code to utilize pastebins instead.

## Starting the Bot (For the First Time)

Not required for starting, but recommended for personalization, replace all instances of `Parallel` in the `src` files with your bot's name.

1. Ensure all environment variables (listed above) are defined in a `.env` file.
2. Install all dependencies. With npm, run `npm install`. With yarn, run `yarn install`.
3. Ensure the `prisma/schema.prisma` file matches the structure of your database. If not, run `npx prisma db push`.
   If it already does, ensure that the client has been generated. Upon running `npx prisma db push` it automatically generates, but
   by running `npx prisma generate` you can generate the client locally.
4. To build the source files, run `npm run build` or `tsc`.
5. Run `node deploy.js` to push all slash commands to the bot.
6. To then run the compiled js files, run `npm run start` or `node .` or `node dist/index.js`.

After all of the steps above have been completed, for running future times, only the last step will have to be executed to start the bot.

## Contributing

If you find any issues in the code or possible ways to improve the code, or want to add a new feature, please do feel free to make a pull request.
However, do try staying away from huge new features. <br /><br />
Please do not make a pull request for the following:

- Formatting. All code is automatically formatted with [prettier](https://www.npmjs.com/package/prettier).
- Typos. Bringing attention to typos is appreciated, but rather just create a new issue or directly contact a developer about a typo.
- Micro performance optimizations.

Please ensure your code is well commented, formatted with prettier using the prettier settings in the `.prettierrc.yml` file, and thoroughly tested.
<br /><br />
Upon getting a pull request approved, you can request the contributor role in the [official Discord server](https://discord.gg/v2AV3XtnBM)

## License

This work is licensed under the MIT License. To view a copy of this license, visit https://opensource.org/license/mit

The license is also listed in the `LICENSE` file. You may not impersonate the original Parallel bot as that goes against Discord's [community guidelines](https://discord.com/guidelines).
