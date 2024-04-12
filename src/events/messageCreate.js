const Discord = require('discord.js');
// NSFW Vars
const checkNSFW = require('../check-nsfw');
const urlRegex = /(https?:\/\/[^\s]+)/g;

/**
 *
 * @param {Discord.Message} message
 */
async function messageHandler(message) {
	// Ignore bot messages
	if (message.author.bot) return;

	if (!message.content.trim() && message.attachments.size == 0) {
		await message.delete();
		return;
	}

	// check if the message has any URLs
	const urls = message.cleanContent.match(urlRegex) || [];
	
	// if the message has any URLs or attachments check them for NSFW content
	if (urls.length > 0 || message.attachments.size > 0) {
		// get the URLs from attachments
		for (const attachment of message.attachments.values()) {
			if (attachment.width && attachment.height) { // images have these set
				urls.push(attachment.url);
			}
		}

		checkNSFW(message, urls);
	}
}

module.exports = messageHandler;
