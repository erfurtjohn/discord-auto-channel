import { deleteConfigByTrigger } from "../lib/autoChannelConfig.js";
import { logConsole } from "../lib/logHelper.js";

export const name = "channelDelete";

export async function execute(channel) {
    const { count } = await deleteConfigByTrigger(channel.id);

    if (count > 0) {
        logConsole(`🗑️ Trigger-Kanal ${channel.id} wurde gelöscht – zugehörige Auto-Channel-Konfiguration entfernt.`);
    }
}
