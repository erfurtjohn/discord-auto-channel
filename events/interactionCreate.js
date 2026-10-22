import { MessageFlags } from "discord.js";
import { commands } from "../commands/index.js";
import { logConsole } from "../lib/logHelper.js";

export const name = "interactionCreate";

export async function execute(interaction) {
    if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
        if (interaction.isAutocomplete()) {
            await command.autocomplete?.(interaction);
            return;
        }

        await command.execute(interaction);
    } catch (err) {
        logConsole(`❌ Fehler bei /${interaction.commandName}: ${err?.stack ?? err}`);

        if (interaction.isAutocomplete()) return;

        const payload = { content: "❌ An error occurred while executing the command.", flags: MessageFlags.Ephemeral };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(payload).catch(() => { });
        } else {
            await interaction.reply(payload).catch(() => { });
        }
    }
}
