const Discord = require('discord.js');
const db = require('../db');
const util = require('../util');

const threadLockTimeouts = new Map();
const ignoredThreadIds = [];

/**
 *
 * @param {Discord.ThreadChannel} oldThread
 * @param {Discord.ThreadChannel} newThread
 */
async function threadUpdateHandler(oldThread, newThread) {
	const matchmakingChannelId = db.getDB().get('channels.matchmaking');
	if (!matchmakingChannelId) {
		console.log('Missing matchmaking channel!');
		return;
	}
	let matchmakingLockTimeout = parseInt(db.getDB().get('matchmaking.lock-timeout-seconds'));
	if (!matchmakingLockTimeout) {
		console.log('Missing matchmaking lock timeout! Defaulting to 0 (immediate lock).');
		matchmakingLockTimeout = 0;
	}

	if (newThread.parentId !== matchmakingChannelId || ignoredThreadIds.includes(newThread.id)) {
		return;
	}

	if (!oldThread.archived && newThread.archived) {
		if (threadLockTimeouts.get(newThread.id)) {
			clearTimeout(threadLockTimeouts.get(newThread.id));
			threadLockTimeouts.delete(newThread.id);
		}

		const threadLockTimeout = setTimeout(() => {
			lockMatchmakingThread(newThread);
		}, matchmakingLockTimeout * 1000);
		threadLockTimeouts.set(newThread.id, threadLockTimeout);
	} else if (oldThread.archived && !newThread.archived) {
		if (threadLockTimeouts.get(newThread.id)) {
			clearTimeout(threadLockTimeouts.get(newThread.id));
			threadLockTimeouts.delete(newThread.id);
		}
	}
}

/**
 *
 * @param {Discord.ThreadChannel} thread
 */
async function lockMatchmakingThread(thread) {
	// Prevent the bot from catching its own thread update events
	ignoredThreadIds.push(thread.id);

	const guild = await thread.guild.fetch();

	await thread.setArchived(false);
	await thread.setLocked(true, 'Automatic lock of inactive matchmaking thread');
	await thread.setArchived(true);

	const eventLogEmbed = new Discord.MessageEmbed();
	eventLogEmbed.setColor(0x6060ff);
	eventLogEmbed.setTitle('Event Type: _Matchmaking Thread Locked_');
	eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
	eventLogEmbed.setFields(
		{
			name: 'Thread',
			value: `<#${thread.id}>`,
		},
		{
			name: 'Thread ID',
			value: thread.id,
		},
		{
			name: 'Creator',
			value: `<@${thread.ownerId}>`,
		},
		{
			name: 'Members',
			value: thread.memberCount.toString(),
		},
		{
			name: 'Created at',
			value: thread.createdAt.toLocaleString(),
		},
		{
			name: 'Archived at',
			value: thread.archivedAt.toLocaleString(),
		}
	);
	eventLogEmbed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL(),
	});
	await util.sendEventLogMessage(guild, thread.parentId, eventLogEmbed);

	setTimeout(() => {
		// Bot might get the threadUpdate event for the thread being re-archived some time after the await finishes
		ignoredThreadIds.splice(ignoredThreadIds.indexOf(thread.id), 1);
		threadLockTimeouts.delete(thread.id);
	}, 1000 * 2);
}

module.exports = threadUpdateHandler;
