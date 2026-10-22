import { initAutoChannel } from "../lib/autoChannel.js";

export const name = "voiceStateUpdate";

export async function execute(oldState, newState) {
    if (oldState.channel?.id === newState.channel?.id) return;

    await initAutoChannel(oldState, newState);
}
