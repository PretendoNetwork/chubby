import { checkNSFW } from '@/check-nsfw';
import { getDB } from '@/db';
import { MatchmakingThread } from '@/models/matchmakingThreads';
import { ChannelType } from 'discord.js';
import type { Message } from 'discord.js';

const urlRegex = /(https?:\/\/[^\s]+)/g;

export default async function messageCreateHandler(message: Message): Promise<void> {
	// Ignore bot messages
	if (message.author.bot) {
		return;
	}

	// check if the message has any URLs
	const urls: string[] = message.cleanContent.match(urlRegex) || [];
	
	// if the message has any URLs or attachments check them for NSFW content
	if (urls.length > 0 || message.attachments.size > 0) {
		// get the URLs from attachments
		for (const attachment of message.attachments.values()) {
			if (attachment.width && attachment.height) { // images have these set
				urls.push(attachment.url);
			}
		}

		await checkNSFW(message, urls);
	}

	await handleMatchmakingThreadMessage(message);
}

async function handleMatchmakingThreadMessage(message: Message): Promise<void> {
	const matchmakingChannelId = getDB().get('channels.matchmaking');
	if (!matchmakingChannelId) {
		console.log('Missing matchmaking channel!');
		return;
	}

	if (message.channel.type !== ChannelType.PublicThread || message.channel.parentId !== matchmakingChannelId) {
		return;
	}

	await MatchmakingThread.upsert({ thread_id: message.channelId, last_message_sent: message.createdAt });
}
