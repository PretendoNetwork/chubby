import { handleMatchmakingThreadMessage } from '@/matchmaking-threads';
import { handleLeveling } from '@/leveling';
import { getSetting } from '@/models/settings';
import type { Message } from 'discord.js';

export default async function messageCreateHandler(message: Message): Promise<void> {
	// Ignore bot messages
	if (message.author.bot) {
		return;
	}

	if (!message.guild) {
		message.reply('Hello! These DMs are __not__ monitored.\n\nIf you wish to contact Pretendo\'s mod team, please read the contents of https://discord.com/channels/408718485913468928/1370584407261581392, then create a modmail ticket for your issue.\n\nIf you want to submit a Network appeal/report or Discord ban appeal, please do so on the **[Forum](<https://forum.pretendo.network/>)**.\n\nTo view your warns, run Chubby\'s `/user-info` command.');
	} else {
		if (await getSetting('leveling.enabled')) {
			await handleLeveling(message);
		}
	}

	await handleMatchmakingThreadMessage(message);
}
