import {
    ChannelType,
    EmbedBuilder,
    InteractionContextType,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import {
    createConfig,
    deleteConfig,
    getConfigByName,
    getConfigByTrigger,
    listConfigs,
    updateConfig,
} from "../lib/autoChannelConfig.js";
import { createLogEmbed, logConsole } from "../lib/logHelper.js";

const PATTERN_HELP = "Platzhalter: %USERNAME%, %DISPLAYNAME%";

export const data = new SlashCommandBuilder()
    .setName("autochannel")
    .setDescription("Auto-Channel-Konfigurationen verwalten")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((sub) =>
        sub
            .setName("add")
            .setDescription("Neue Auto-Channel-Konfiguration anlegen")
            .addStringOption((o) =>
                o.setName("name").setDescription("Interner Name der Konfiguration").setRequired(true).setMaxLength(50)
            )
            .addChannelOption((o) =>
                o
                    .setName("trigger")
                    .setDescription("Sprachkanal, der beim Betreten einen neuen Kanal erzeugt")
                    .addChannelTypes(ChannelType.GuildVoice)
                    .setRequired(true)
            )
            .addStringOption((o) =>
                o
                    .setName("pattern")
                    .setDescription(`Namensschema für neue Kanäle (${PATTERN_HELP})`)
                    .setRequired(true)
                    .setMaxLength(100)
            )
            .addChannelOption((o) =>
                o
                    .setName("category")
                    .setDescription("Kategorie für neue Kanäle (Standard: Kategorie des Trigger-Kanals)")
                    .addChannelTypes(ChannelType.GuildCategory)
            )
    )
    .addSubcommand((sub) =>
        sub
            .setName("edit")
            .setDescription("Bestehende Auto-Channel-Konfiguration bearbeiten")
            .addStringOption((o) =>
                o.setName("name").setDescription("Konfiguration").setRequired(true).setAutocomplete(true)
            )
            .addStringOption((o) =>
                o.setName("new_name").setDescription("Neuer interner Name").setMaxLength(50)
            )
            .addChannelOption((o) =>
                o
                    .setName("trigger")
                    .setDescription("Neuer Trigger-Sprachkanal")
                    .addChannelTypes(ChannelType.GuildVoice)
            )
            .addStringOption((o) =>
                o.setName("pattern").setDescription(`Neues Namensschema (${PATTERN_HELP})`).setMaxLength(100)
            )
            .addChannelOption((o) =>
                o
                    .setName("category")
                    .setDescription("Neue Kategorie für neue Kanäle")
                    .addChannelTypes(ChannelType.GuildCategory)
            )
            .addBooleanOption((o) =>
                o
                    .setName("reset_category")
                    .setDescription("Kategorie zurücksetzen (wieder Kategorie des Trigger-Kanals verwenden)")
            )
    )
    .addSubcommand((sub) =>
        sub
            .setName("remove")
            .setDescription("Auto-Channel-Konfiguration löschen")
            .addStringOption((o) =>
                o.setName("name").setDescription("Konfiguration").setRequired(true).setAutocomplete(true)
            )
    )
    .addSubcommand((sub) => sub.setName("list").setDescription("Alle Auto-Channel-Konfigurationen anzeigen"));

const reply = (interaction, content) =>
    interaction.reply({ content, flags: MessageFlags.Ephemeral });

const describeConfig = (cfg) => {
    const category = cfg.parentChannelId ? `<#${cfg.parentChannelId}>` : "_wie Trigger-Kanal_";

    return `**Trigger:** <#${cfg.triggerChannelId}>\n**Kategorie:** ${category}\n**Schema:** \`${cfg.nameConvention}\``;
};

const sendLog = async (interaction, title, text, color) => {
    const logChannel = await interaction.guild.channels.fetch(process.env.LOG_CHANNEL_ID).catch(() => null);

    if (!logChannel) return;

    await logChannel.send({ embeds: [createLogEmbed({ title, text, color })] }).catch(console.error);
};

const handleAdd = async (interaction) => {
    const name = interaction.options.getString("name", true).trim();
    const trigger = interaction.options.getChannel("trigger", true);
    const pattern = interaction.options.getString("pattern", true);
    const category = interaction.options.getChannel("category");
    const guildId = interaction.guildId;

    if (await getConfigByName(guildId, name)) {
        return reply(interaction, `❌ Es gibt bereits eine Konfiguration mit dem Namen **${name}**.`);
    }

    const existingTrigger = await getConfigByTrigger(trigger.id);

    if (existingTrigger) {
        return reply(interaction, `❌ <#${trigger.id}> ist bereits Trigger der Konfiguration **${existingTrigger.name}**.`);
    }

    const cfg = await createConfig({
        guildId,
        name,
        triggerChannelId: trigger.id,
        parentChannelId: category?.id ?? null,
        nameConvention: pattern,
    });

    logConsole(`✅ Auto-Channel-Konfiguration "${cfg.name}" angelegt von ${interaction.user.tag}`);

    await sendLog(
        interaction,
        "⚙️ Auto-Channel-Konfiguration angelegt",
        `**${cfg.name}** von <@${interaction.user.id}>\n${describeConfig(cfg)}`,
        "#26FF00"
    );

    return reply(interaction, `✅ Konfiguration **${cfg.name}** angelegt.\n${describeConfig(cfg)}`);
};

const handleEdit = async (interaction) => {
    const name = interaction.options.getString("name", true);
    const newName = interaction.options.getString("new_name")?.trim();
    const trigger = interaction.options.getChannel("trigger");
    const pattern = interaction.options.getString("pattern");
    const category = interaction.options.getChannel("category");
    const resetCategory = interaction.options.getBoolean("reset_category") ?? false;
    const guildId = interaction.guildId;

    const cfg = await getConfigByName(guildId, name);

    if (!cfg) return reply(interaction, `❌ Keine Konfiguration mit dem Namen **${name}** gefunden.`);

    if (category && resetCategory) {
        return reply(interaction, "❌ `category` und `reset_category` können nicht gleichzeitig gesetzt werden.");
    }

    const changes = {};

    if (newName && newName !== cfg.name) {
        if (await getConfigByName(guildId, newName)) {
            return reply(interaction, `❌ Es gibt bereits eine Konfiguration mit dem Namen **${newName}**.`);
        }
        changes.name = newName;
    }

    if (trigger && trigger.id !== cfg.triggerChannelId) {
        const other = await getConfigByTrigger(trigger.id);
        if (other) {
            return reply(interaction, `❌ <#${trigger.id}> ist bereits Trigger der Konfiguration **${other.name}**.`);
        }
        changes.triggerChannelId = trigger.id;
    }

    if (pattern) changes.nameConvention = pattern;
    if (category) changes.parentChannelId = category.id;
    if (resetCategory) changes.parentChannelId = null;

    if (Object.keys(changes).length === 0) {
        return reply(interaction, "ℹ️ Keine Änderungen angegeben.");
    }

    const updated = await updateConfig(cfg.id, changes);

    logConsole(`✅ Auto-Channel-Konfiguration "${cfg.name}" bearbeitet von ${interaction.user.tag}`);

    await sendLog(
        interaction,
        "⚙️ Auto-Channel-Konfiguration bearbeitet",
        `**${updated.name}** von <@${interaction.user.id}>\n${describeConfig(updated)}`,
        "#FFA500"
    );

    return reply(interaction, `✅ Konfiguration **${updated.name}** aktualisiert.\n${describeConfig(updated)}`);
};

const handleRemove = async (interaction) => {
    const name = interaction.options.getString("name", true);
    const cfg = await getConfigByName(interaction.guildId, name);

    if (!cfg) return reply(interaction, `❌ Keine Konfiguration mit dem Namen **${name}** gefunden.`);

    await deleteConfig(cfg.id);

    logConsole(`✅ Auto-Channel-Konfiguration "${cfg.name}" gelöscht von ${interaction.user.tag}`);

    await sendLog(
        interaction,
        "⚙️ Auto-Channel-Konfiguration gelöscht",
        `**${cfg.name}** von <@${interaction.user.id}>\n${describeConfig(cfg)}`,
        "#FF0000"
    );

    return reply(
        interaction,
        `🗑️ Konfiguration **${cfg.name}** gelöscht. Bereits erstellte Kanäle bleiben bestehen, bis sie leer sind.`
    );
};

const handleList = async (interaction) => {
    const configs = await listConfigs(interaction.guildId);

    if (configs.length === 0) {
        return reply(interaction, "ℹ️ Noch keine Auto-Channel-Konfigurationen. Lege eine mit `/autochannel add` an.");
    }

    const embed = new EmbedBuilder()
        .setTitle("Auto-Channel-Konfigurationen")
        .setColor("#5865F2")
        .addFields(configs.slice(0, 25).map((cfg) => ({ name: cfg.name, value: describeConfig(cfg) })));

    if (configs.length > 25) embed.setFooter({ text: `… und ${configs.length - 25} weitere` });

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
};

const handlers = { add: handleAdd, edit: handleEdit, remove: handleRemove, list: handleList };

export async function execute(interaction) {
    const sub = interaction.options.getSubcommand();

    return handlers[sub]?.(interaction);
}

export async function autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const configs = await listConfigs(interaction.guildId);

    await interaction.respond(
        configs
            .filter((cfg) => cfg.name.toLowerCase().includes(focused))
            .slice(0, 25)
            .map((cfg) => ({ name: cfg.name, value: cfg.name }))
    );
}
