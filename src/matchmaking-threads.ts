import { MatchmakingThread } from '@/models/matchmakingThreads';
import { User } from '@/models/users';
import { sendEventLogMessage } from '@/util';
import { getDB } from './db';
import { ChannelType, EmbedBuilder } from 'discord.js';
import type { Client } from 'discord.js';

export async function checkMatchmakingThreads(client: Client): Promise<void> {
	let matchmakingLockTimeout = parseInt(getDB().get('matchmaking.lock-timeout-seconds') ?? '0');
	if (!matchmakingLockTimeout) {
		console.log('Missing matchmaking lock timeout! Defaulting to 1 hour.');
		matchmakingLockTimeout = 60 * 60;
	}

	const now = Date.now();
	const matchmakingThreads = await MatchmakingThread.findAll();

	for (const thread of matchmakingThreads) {
		let threadChannel;
		try {
			threadChannel = await client.channels.fetch(thread.thread_id);
		} catch (err) {
			console.log(`Error fetching matchmaking thread channel: ${err}`);
			threadChannel = null;
		}

		if (!threadChannel || threadChannel.type !== ChannelType.PublicThread) {
			// * Thread is either deleted or not a public thread, which should not happen
			console.log(`Removing deleted or invalid matchmaking thread from database: ${thread.thread_id}`);
			await MatchmakingThread.destroy({ where: { thread_id: thread.thread_id } });
			continue;
		}

		const lastMessageSent = new Date(thread.last_message_sent).getTime();
		const timeSinceLastMessage = now - lastMessageSent;

		if (timeSinceLastMessage > matchmakingLockTimeout * 1000) {
			const guild = await threadChannel.guild.fetch();

			// * Only send any inactivity messages if the thread has not already been manually closed/locked by moderators
			if (!threadChannel.archived && !threadChannel.locked) {
				if (threadChannel.ownerId) {
					const creator = await User.findOne({ where: { user_id: threadChannel.ownerId } });
					if (!creator?.matchmaking_notification_sent) {
						const notificationEmbed = new EmbedBuilder();
						notificationEmbed.setColor(0x6060ff);
						notificationEmbed.setTitle('Your matchmaking thread has been automatically closed');
						notificationEmbed.setDescription(
							`Hello <@${threadChannel.ownerId}>! This is just to let you know that your Pretendo matchmaking thread <#${threadChannel.id}> has been automatically closed due to inactivity.\n\n` +
								`**This is not a moderator action or punishment.** All threads in <#${threadChannel.parentId}> are automatically closed after a period of inactivity to ensure that each thread is dedicated to a single game session.\n\n` +
								'**If you want to play again, just create a new thread and ping the people you want to invite. Have fun!**\n\n' +
								'*Note:* This is a **one-time notification** that is sent to all server members to after their first matchmaking thread is closed. You will not be notified when your matchmaking threads are closed in the future.'
						);
						notificationEmbed.setFooter({
							text: 'Thank you for using Pretendo!',
							iconURL: guild.iconURL()!
						});
						const creatorUser = await client.users.fetch(threadChannel.ownerId);
						try {
							//TODO - Switch this to the new DM/notification channel system
							await creatorUser.send({
								embeds: [notificationEmbed]
							});
							await User.upsert({ user_id: threadChannel.ownerId, matchmaking_notification_sent: true });
						} catch (err) {
							console.log('Failed to DM user');
						}
					}
				}

				const inactivityEmbed = new EmbedBuilder();
				inactivityEmbed.setColor(0x6060ff);
				inactivityEmbed.setTitle('Matchmaking thread closed');
				inactivityEmbed.setDescription(
					'This matchmaking thread has been automatically closed due to inactivity.\n\n' +
						'If you want to play again, just create a new thread and ping the people you want to invite. Have fun!'
				);
				inactivityEmbed.setFooter({
					text: 'Thank you for using Pretendo!',
					iconURL: guild.iconURL()!
				});
				await threadChannel.send({
					embeds: [inactivityEmbed]
				});
			}

			await threadChannel.setArchived(false);
			await threadChannel.setLocked(true, 'Automatic lock of inactive matchmaking thread.');
			await threadChannel.setArchived(true);
			await MatchmakingThread.destroy({ where: { thread_id: thread.thread_id } });

			const eventLogEmbed = new EmbedBuilder();
			eventLogEmbed.setColor(0x6060ff);
			eventLogEmbed.setTitle('Event Type: _Matchmaking Thread Locked_');
			eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
			eventLogEmbed.setFields(
				{
					name: 'Thread',
					value: `<#${threadChannel.id}>`
				},
				{
					name: 'Thread ID',
					value: threadChannel.id
				},
				{
					name: 'Creator',
					value: `<@${threadChannel.ownerId}>`
				},
				{
					name: 'Members',
					value: threadChannel.memberCount?.toString() ?? 'Unknown'
				},
				{
					name: 'Created at',
					value: threadChannel.createdAt ? `<t:${Math.floor(threadChannel.createdAt.getTime() / 1000)}>` : 'Unknown'
				},
				{
					name: 'Archived at',
					value: threadChannel.archivedAt ? `<t:${Math.floor(threadChannel.archivedAt.getTime() / 1000)}>` : 'Unknown'
				}
			);
			eventLogEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()!
			});
			await sendEventLogMessage(guild, threadChannel.parentId, eventLogEmbed);
		}
	}
}
