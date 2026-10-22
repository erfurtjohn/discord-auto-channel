import { EmbedBuilder } from "discord.js";

export const logConsole = (message) => {
    const timestampString = formattedTimeString();
    const timestamp = `[${timestampString}]`;
    console.log(`${timestamp} ${message}`);
}

const formattedTimeString = () => {
    const now = new Date();
    const formattedTime = now.toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });

    return formattedTime;
}

export const createLogEmbed = ({ title, text, color }) => {
    const serverEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(text)
        .setFooter({ text: formattedTimeString() });

    return serverEmbed;
}