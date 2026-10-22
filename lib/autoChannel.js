import 'dotenv/config';
import { ChannelType, PermissionFlagsBits } from "discord.js";
import { prisma } from "../utils/db.server.js";
import { createLogEmbed, logConsole } from "./logHelper.js";
import { buildChannelName, getConfigByTrigger } from "./autoChannelConfig.js";

export const initAutoChannel = async (oldState, newState) => {
    const channelOption = newState.channel ? await getConfigByTrigger(newState.channel.id) : null;

    if (channelOption) {
        const user = await newState.member.user;
        const memberRoles = await newState.member.roles.cache;
        const logChannel = await newState.guild.channels.fetch(process.env.LOG_CHANNEL_ID);
        const communityRoleId = "853777005551288320";
        const everyoneRoleId = "475820587063967784";
        let communityMember = false;

        if (memberRoles.size == 2 && memberRoles.has(communityRoleId) && memberRoles.has(everyoneRoleId)) {
            communityMember = true;
        }

        const newChannel = await newState.guild.channels.create({
            name: buildChannelName(channelOption.nameConvention, newState.member),
            type: ChannelType.GuildVoice,
            // without own category -> in the category of the trigger channel
            parent: channelOption.parentChannelId ?? newState.channel.parentId,
        });

        logConsole(`✅ Created new voice channel: ${newChannel.name} (ID: ${newChannel.id}) for user ${user.tag} (ID: ${user.id})`);

        if (logChannel) {
            logChannel.send({
                embeds: [createLogEmbed({
                    title: "✅ Voice channel created",
                    text: `New voice channel with ID \`${newChannel.id}\` for <@${newState.member.id}> was created.`,
                    color: "#26FF00"
                })]
            });
        }

        await newState.member.voice.setChannel(newChannel);

        const communityRole = newState.guild.roles.cache.get(communityRoleId);

        await newChannel.permissionOverwrites.edit(newState.member, {
            ManageChannels: true,
        }).catch(console.error);

        if (communityRole) {
            if (communityMember) {
                await newChannel.permissionOverwrites
                    .edit(communityRole, {
                        Connect: true,
                    })
                    .catch(console.error);
            }

            logConsole(`✅ Updated permissions for channel ${newChannel.name} (ID: ${newChannel.id}) - Community Role: ${communityMember ? "Granted Connect" : "No changes"}`);
        } else {
            console.error(`Role with ID ${communityRoleId} not found in guild cache.`);
        }

        await prisma.autoChannel.create({
            data: {
                channelId: newChannel.id,
                CreatedByGuildMember: newState.member.id,
                currentUsers: 0,
                created_at: new Date(),
            },
        });

        logConsole(`✅ Created auto channel with ID ${newChannel.id} for user ${user.tag} (ID: ${user.id})`);
    }

    // update counter if someone joins channel
    if (newState.channel?.id) {
        const isAutoChannel = await prisma.autoChannel.findUnique({
            where: {
                channelId: newState.channel.id,
            },
        });

        if (isAutoChannel && !isNaN(isAutoChannel.currentUsers)) {
            await prisma.autoChannel.update({
                where: { channelId: newState.channel.id },
                data: { currentUsers: { increment: 1 } },
            });

            logConsole(`✅ Incremented user count for channel ID ${newState.channel.id}. Current users: ${isAutoChannel.currentUsers + 1}`);
        }
    }

    // update counter if someone leaves channel
    if (oldState.channel?.id) {
        const logChannel = await oldState.guild.channels.fetch(process.env.LOG_CHANNEL_ID);

        const isAutoChannel = await prisma.autoChannel.findUnique({
            where: {
                channelId: oldState.channel.id,
            },
        });

        if (isAutoChannel && isAutoChannel.currentUsers - 1 === 0) {
            await prisma.autoChannel.delete({
                where: {
                    channelId: oldState.channel.id,
                },
            });

            logConsole(`✅ Deleted auto channel with ID ${oldState.channel.id} as it has no more users.`);

            if (logChannel) {
                logChannel.send({
                    embeds: [createLogEmbed({
                        title: "❌ Voice channel removed",
                        text: `Voice channel with ID \`${oldState.channel.id}\` from <@${isAutoChannel.CreatedByGuildMember}> was removed.`,
                        color: "#FF0000"
                    })]
                });
            }

            await oldState.guild.channels.delete(oldState.channel);
        }

        if (isAutoChannel && isAutoChannel.currentUsers - 1 > 0) {
            await prisma.autoChannel.update({
                where: { channelId: oldState.channel.id },
                data: { currentUsers: { decrement: 1 } },
            });

            logConsole(`✅ Decremented user count for channel ID ${oldState.channel.id}. Current users: ${isAutoChannel.currentUsers - 1}`);
        }
    }
};
