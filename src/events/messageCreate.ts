import { handleMatchmakingThreadMessage } from '@/matchmaking-threads';
import { handleLeveling } from '@/leveling';
import { getSetting } from '@/models/settings';
import type { Message } from 'discord.js';

export default async function messageCreateHandler(message: Message): Promise<void> {
	// Ignore bot messages
	if (message.author.bot) {
		return;
	}

	if (await getSetting('leveling.enabled')) {
		await handleLeveling(message);
	}

	await handleMatchmakingThreadMessage(message);
}
