import { readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = (await readdir(__dirname))
    .filter(f => f.endsWith(".js") && f !== "index.js");

const events = [];

for (const file of files) {
    const mod = await import(new URL(`./${file}`, import.meta.url));

    const evt = mod.default ?? mod;

    if (evt && Object.keys(evt).length > 0) {
        events.push(evt);
    }
}

export const registerEvent = (client, e, activeCollections) => {
    if (e.once) {
        client.once(e.name, (...args) => e.execute(...args));
    } else {
        client.on(e.name, (...args) =>
            e.execute(...args, activeCollections, client)
        );
    }
};

export { events };
