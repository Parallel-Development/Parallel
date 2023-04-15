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
- `TOKEN`={Discord bot token}
- `CLIENT_ID`={Discord client ID}
- `DATABASE_URL`={Postgresql connect url}

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

<hr />

Copyright (c) 2023 Michael (633776442366361601)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


<hr />

The license is also listed in the `LICENSE` file. You may not impersonate the original Parallel bot as that goes against Discord's [community guidelines](https://discord.com/guidelines).