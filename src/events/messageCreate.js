const Discord = require('discord.js');

const checkNSFW = require('../check-nsfw');
const db = require('../db');
const MatchmakingThreads = require('../models/matchmakingThreads');

const urlRegex = /(https?:\/\/[^\s]+)/g;

/**
 *
 * @param {Discord.Message} message
 */
async function messageHandler(message) {
	// Ignore bot messages
	if (message.author.bot) return;

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

	await handleMatchmakingThreadMessage(message);
}

/**
 *
 * @param {Discord.Message} message
 */
async function handleMatchmakingThreadMessage(message) {
	const matchmakingChannelId = db.getDB().get('channels.matchmaking');
	if (!matchmakingChannelId) {
		console.log('Missing matchmaking channel!');
		return;
	}

	if (message.channel.type !== 'GUILD_PUBLIC_THREAD' || message.channel.parentId !== matchmakingChannelId) {
		return;
	}

	await MatchmakingThreads.upsert({ id: message.channelId, lastMessageSent: message.createdAt });
}

module.exports = messageHandler;