import { checkNSFW } from '@/check-nsfw';
import type { Message } from 'discord.js';

const urlRegex = /(https?:\/\/[^\s]+)/g;

export async function messageCreateHandler(message: Message): Promise<void> {
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
}
