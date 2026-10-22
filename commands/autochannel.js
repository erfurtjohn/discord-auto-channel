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
    .addSubcommand((sub) => sub.setName("list").setDescription("Show all Auto-Channel configurations"));

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
        return reply(interaction, `❌ There is already a configuration with the name **${name}**.`);
    }

    const existingTrigger = await getConfigByTrigger(trigger.id);

    if (existingTrigger) {
        return reply(interaction, `❌ <#${trigger.id}> is already a trigger for the configuration **${existingTrigger.name}**.`);
    }

    const cfg = await createConfig({
        guildId,
        name,
        triggerChannelId: trigger.id,
        parentChannelId: category?.id ?? null,
        nameConvention: pattern,
    });

    logConsole(`✅ Auto-Channel-Configuration "${cfg.name}" created by ${interaction.user.tag}`);

    await sendLog(
        interaction,
        "⚙️ Auto-Channel-Configuration created",
        `**${cfg.name}** by <@${interaction.user.id}>\n${describeConfig(cfg)}`,
        "#26FF00"
    );

    return reply(interaction, `✅ Configuration **${cfg.name}** created.\n${describeConfig(cfg)}`);
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

    if (!cfg) return reply(interaction, `❌ No configuration with the name **${name}** found.`);

    if (category && resetCategory) {
        return reply(interaction, "❌ `category` and `reset_category` cannot be set simultaneously.");
    }

    const changes = {};

    if (newName && newName !== cfg.name) {
        if (await getConfigByName(guildId, newName)) {
            return reply(interaction, `❌ There is already a configuration with the name **${newName}**.`);
        }
        changes.name = newName;
    }

    if (trigger && trigger.id !== cfg.triggerChannelId) {
        const other = await getConfigByTrigger(trigger.id);
        if (other) {
            return reply(interaction, `❌ <#${trigger.id}> is already a trigger for the configuration **${other.name}**.`);
        }
        changes.triggerChannelId = trigger.id;
    }

    if (pattern) changes.nameConvention = pattern;
    if (category) changes.parentChannelId = category.id;
    if (resetCategory) changes.parentChannelId = null;

    if (Object.keys(changes).length === 0) {
        return reply(interaction, "ℹ️ No changes specified.");
    }

    const updated = await updateConfig(cfg.id, changes);

    logConsole(`✅ Auto-Channel-Configuration "${cfg.name}" edited by ${interaction.user.tag}`);

    await sendLog(
        interaction,
        "⚙️ Auto-Channel-Configuration edited",
        `**${updated.name}** by <@${interaction.user.id}>\n${describeConfig(updated)}`,
        "#FFA500"
    );

    return reply(interaction, `✅ Configuration **${updated.name}** updated.\n${describeConfig(updated)}`);
};

const handleRemove = async (interaction) => {
    const name = interaction.options.getString("name", true);
    const cfg = await getConfigByName(interaction.guildId, name);

    if (!cfg) return reply(interaction, `❌ No configuration with the name **${name}** found.`);

    await deleteConfig(cfg.id);

    logConsole(`✅ Auto-Channel-Configuration "${cfg.name}" deleted by ${interaction.user.tag}`);

    await sendLog(
        interaction,
        "⚙️ Auto-Channel-Configuration deleted",
        `**${cfg.name}** by <@${interaction.user.id}>\n${describeConfig(cfg)}`,
        "#FF0000"
    );

    return reply(
        interaction,
        `🗑️ Configuration **${cfg.name}** deleted. Already created channels will remain until they are empty.`
    );
};

const handleList = async (interaction) => {
    const configs = await listConfigs(interaction.guildId);

    if (configs.length === 0) {
        return reply(interaction, "ℹ️ No auto-channel configurations found. Create one with `/autochannel add`.");
    }

    const embed = new EmbedBuilder()
        .setTitle("Auto-Channel-Configurations")
        .setColor("#5865F2")
        .addFields(configs.slice(0, 25).map((cfg) => ({ name: cfg.name, value: describeConfig(cfg) })));

    if (configs.length > 25) embed.setFooter({ text: `… and ${configs.length - 25} more` });

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
