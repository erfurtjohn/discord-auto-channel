import { prisma } from "../utils/db.server.js";

// Zentrale Zugriffe auf die Auto-Channel-Konfiguration (Tabelle AutoChannelConfig).

export const getConfigByTrigger = (triggerChannelId) =>
    prisma.autoChannelConfig.findUnique({ where: { triggerChannelId } });

export const getConfigByName = (guildId, name) =>
    prisma.autoChannelConfig.findUnique({ where: { guildId_name: { guildId, name } } });

export const listConfigs = (guildId) =>
    prisma.autoChannelConfig.findMany({ where: { guildId }, orderBy: { name: "asc" } });

export const createConfig = (data) =>
    prisma.autoChannelConfig.create({ data });

export const updateConfig = (id, data) =>
    prisma.autoChannelConfig.update({ where: { id }, data });

export const deleteConfig = (id) =>
    prisma.autoChannelConfig.delete({ where: { id } });

export const deleteConfigByTrigger = (triggerChannelId) =>
    prisma.autoChannelConfig.deleteMany({ where: { triggerChannelId } });

// Platzhalter im Namensschema ersetzen; Discord erlaubt max. 100 Zeichen.
export const buildChannelName = (nameConvention, member) =>
    nameConvention
        .replaceAll("%USERNAME%", member.user.username)
        .replaceAll("%DISPLAYNAME%", member.displayName)
        .slice(0, 100);
