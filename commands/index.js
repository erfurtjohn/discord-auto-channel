import { readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Collection } from "discord.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = (await readdir(__dirname)).filter((f) => f.endsWith(".js") && f !== "index.js");

// every file exports: data (SlashCommandBuilder), execute(interaction), optional autocomplete(interaction) 
export const commands = new Collection();

for (const file of files) {
    const mod = await import(new URL(`./${file}`, import.meta.url));

    if (mod.data && mod.execute) {
        commands.set(mod.data.name, mod);
    }
}
