import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { events, registerEvent } from "./events/index.js";

const client = new Client({
    presence: {
        status: 'online',
        activities: [
            {
                name: 'Hier spricht die Logistik: Wir werden bald improvisieren müssen.',
                type: 4
            }
        ]
    },
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
    ],
    partials: [
        Partials.Channel,
        Partials.Message
    ]
});

events.forEach((e) => registerEvent(client, e));

client.login(process.env.TOKEN);
