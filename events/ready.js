import 'dotenv/config';
import { prisma } from "../utils/db.server.js";
import { createLogEmbed, logConsole } from "../lib/logHelper.js";
import { commands } from "../commands/index.js";

export const name = "ready";
export const once = true;

export async function execute(client) {
    logConsole(`Ready! Logged in as ${client.user.tag}`);

    const guild = client.guilds.cache.find(
        (guild) => guild.id == process.env.GUILD_ID
    );

    // register slash commands as guild-commands, no global cache
    try {
        await guild.commands.set(commands.map((c) => c.data.toJSON()));
        logConsole(`Registered ${commands.size} slash command(s): ${[...commands.keys()].join(", ")}`);
    } catch (err) {
        console.error("Failed to register slash commands:", err);
    }

    const logChannel = await guild.channels.fetch(process.env.LOG_CHANNEL_ID);

    // when bot crashes prevent auto channels from lasting forever after restart
    const checkAutoChannels = async (guild) => {
        const localChannels = await prisma.autoChannel.findMany({
            where: {
                currentUsers: {
                    gte: 0,
                },
            },
        });

        // return when no channels in database
        if (!localChannels || localChannels.length === 0) return;

        // iterate through every channel from database
        for (let i = 0; i < localChannels.length; i++) {
            const dbEntry = localChannels[i];
            const guildChannel = guild.channels.cache.get(dbEntry.channelId);

            // Channel doesn't exist anymore -> clean DB
            if (!guildChannel) {
                await prisma.autoChannel.delete({
                    where: { channelId: dbEntry.channelId },
                });
                logConsole(`Auto channel with ID ${dbEntry.channelId} no longer exists. Deleted from database.`);
                continue;
            }

            // exists → inspect users
            const channelUsers = guildChannel.members.size;

            // ignore invalid values
            if (isNaN(channelUsers)) continue;

            // no users → delete DB + channel
            if (channelUsers === 0) {
                await prisma.autoChannel.delete({
                    where: { channelId: guildChannel.id },
                });
                await guild.channels.delete(guildChannel);

                logConsole(`Deleted empty auto channel with ID ${guildChannel.id} and removed it from database.`);

                if (logChannel) {
                    logChannel.send({
                        embeds: [
                            createLogEmbed({
                                title: "❌ Sprachkanal entfernt",
                                text: `Sprachkanal mit ID \`${guildChannel.id}\` wurde entfernt.`,
                                color: "#FF0000",
                            }),
                        ],
                    });
                }

                continue;
            }

            // users > 0 → sync DB
            await prisma.autoChannel.update({
                where: { channelId: guildChannel.id },
                data: { currentUsers: channelUsers },
            });

            logConsole(`Synced auto channel with ID ${guildChannel.id}. Current users: ${channelUsers}. Updated database accordingly.`);
        }
    };

    setInterval(checkAutoChannels, 5_000, guild);
}
