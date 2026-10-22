# discord-auto-channel

A Discord bot that automatically creates a personal voice channel when a member joins a "trigger" voice channel, and deletes it again once it is empty.

Auto-channel configurations are stored in a SQLite database (via Prisma) and managed directly in Discord with the `/autochannel` slash command — no config file needed.

## Requirements

- Node.js 20 or newer
- A Discord application with a bot user ([Developer Portal](https://discord.com/developers/applications))
- Privileged gateway intents enabled for the bot: **Server Members Intent** and **Presence Intent**
- Bot permissions on the server: **Manage Channels**, **Move Members**, **View Channels**, **Connect**, **Send Messages** (for the log channel)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the values:

```env
TOKEN=your-bot-token
APPLICATION_ID=your-application-id
GUILD_ID=your-server-id
LOG_CHANNEL_ID=channel-id-for-log-messages
DATABASE_URL=file:./dev.db
```

| Variable         | Description                                                          |
| ---------------- | -------------------------------------------------------------------- |
| `TOKEN`          | Bot token from the Developer Portal                                  |
| `APPLICATION_ID` | Application (client) ID                                              |
| `GUILD_ID`       | ID of the server the bot runs on; slash commands are registered here |
| `LOG_CHANNEL_ID` | Text channel where the bot posts create/delete/config logs           |
| `DATABASE_URL`   | SQLite database file, e.g. `file:./dev.db`                           |

### 3. Set up the database with Prisma

Generate the Prisma client (output goes to `generated/prisma`):

```bash
npx prisma generate
```

Create or update the database schema from `prisma/schema.prisma`:

```bash
npx prisma db push
```

Run both commands again whenever `prisma/schema.prisma` changes, e.g. after pulling an update.

> **Note:** `db push` syncs the schema directly and is the simplest option for a single bot instance. If you prefer versioned migrations, use `npx prisma migrate deploy` instead. It applies the SQL files in `prisma/migrations`.

### 4. Start the bot

```bash
npm start
```

On startup the bot registers its slash commands as guild commands for `GUILD_ID`, so they are available immediately.

## Usage: `/autochannel`

By default the command is only visible to members with the **Manage Channels** permission. You can change this under _Server Settings → Integrations_. All replies are only visible to the person who ran the command (ephemeral), and every change is posted to the log channel.

| Subcommand | Options                                                                          | Description                      |
| ---------- | -------------------------------------------------------------------------------- | -------------------------------- |
| `add`      | `name`, `trigger`, `pattern`, _`category`_                                       | Create a new configuration       |
| `edit`     | `name`, _`new_name`_, _`trigger`_, _`pattern`_, _`category`_, _`reset_category`_ | Change an existing configuration |
| `remove`   | `name`                                                                           | Delete a configuration           |
| `list`     | –                                                                                | Show all configurations          |

_Italic_ options are optional. For `edit` and `remove`, `name` offers autocomplete.

- **`trigger`**: the voice channel members join to get their own channel. Each voice channel can only be the trigger for one configuration.
- **`pattern`**: naming scheme for created channels. Placeholders:
    - `%USERNAME%`: the member's Discord username
    - `%DISPLAYNAME%`: the member's display name on the server

    Names longer than 100 characters are truncated.

- **`category`**: the category new channels are created in. If it is not set, the trigger channel's category is used. Use `reset_category: True` with `edit` to go back to that default.

### Example

```
/autochannel add name:gaming trigger:#➕ Create Channel pattern:🎮 %DISPLAYNAME%'s Room
```

Removing a configuration does not delete channels that already exist. They are cleaned up as usual once they are empty. If a trigger channel is deleted in Discord, its configuration is removed automatically.

## How it works

- When a member joins a trigger channel, the bot creates a new voice channel, moves the member into it and gives them **Manage Channels** permission on that channel.
- The bot tracks created channels in the `AutoChannel` table and deletes a channel as soon as the last member leaves.
- Every 5 seconds the bot checks tracked channels against the server. This removes channels that were left over, for example after a crash or restart.

## Project structure

```
bot.js                     Entry point, client setup
commands/                  Slash commands (auto-loaded)
  autochannel.js           /autochannel add | edit | remove | list
events/                    Discord event handlers (auto-loaded)
  ready.js                 Command registration, periodic cleanup
  voiceStateUpdate.js      Join/leave handling
  interactionCreate.js     Slash command + autocomplete dispatch
  channelDelete.js         Removes configs of deleted trigger channels
lib/
  autoChannel.js           Channel creation/deletion logic
  autoChannelConfig.js     Database access for configurations
  logHelper.js             Console + embed logging
prisma/schema.prisma       Database schema
```

## npm scripts

| Script                | Command                 |
| --------------------- | ----------------------- |
| `npm start`           | `node bot.js`           |
| `npm run db:generate` | `prisma generate`       |
| `npm run db:push`     | `prisma db push`        |
| `npm run db:migrate`  | `prisma migrate deploy` |
