import { deleteConfigByTrigger } from "../lib/autoChannelConfig.js";
import { logConsole } from "../lib/logHelper.js";

export const name = "channelDelete";

export async function execute(channel) {
    const { count } = await deleteConfigByTrigger(channel.id);

    if (count > 0) {
        logConsole(`🗑️ Trigger channel ${channel.id} was deleted – associated auto-channel configuration removed.`);
    }
}
