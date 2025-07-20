import { ChannelType, ThreadAutoArchiveDuration } from 'discord.js';
import { getChannelFromSettings } from '@/util';
import { NotificationThread } from '@/models/notificationThreads';
import type {
	AllowedThreadTypeForTextChannel,
	BaseGuildTextChannel,
	Guild,
	GuildTextThreadCreateOptions,
	MessageCreateOptions,
	ThreadChannel,
	User
} from 'discord.js';

export async function notifyUser(guild: Guild, user: User, message: string | MessageCreateOptions): Promise<void> {
	try {
		await user.send(message);
	} catch {
		try {
			await notifyUserInChannel(guild, user, message);
		} catch (e) {
			console.log(`Failed to notify user: ${user.displayName} (${user.id})`, e);
		}
	}
}

async function notifyUserInChannel(guild: Guild, user: User, message: string | MessageCreateOptions): Promise<void> {
	const notificationsChannel = await getChannelFromSettings(guild, 'notifications');
	if (!notificationsChannel || notificationsChannel.type !== ChannelType.GuildText) {
		throw 'Could not find notifications channel';
	}

	let thread: ThreadChannel | null = null;
	const cachedThreadMetadata = await NotificationThread.findOne({ where: { user_id: user.id } });
	if (cachedThreadMetadata) {
		try {
			// * Need to wrap this in a `try` because even though `fetch` here says it can return `null` it
			// * throws an exception if no channel is found for an ID
			const cachedThread = await notificationsChannel.threads.fetch(cachedThreadMetadata.thread_id);
			if (cachedThread) {
				if (cachedThread.archived) {
					await cachedThread.setArchived(false);
					await cachedThreadMetadata.update({ updated: new Date() });
				}
				thread = cachedThread;
			}
		} catch {
			await cachedThreadMetadata.destroy();
		}
	}

	if (!thread) {
		thread = await createNotificationThread(notificationsChannel, user);
	}

	if (typeof message === 'string') {
		message = `<@${user.id}>\n${message}`;
	} else {
		message.content = `<@${user.id}>\n${message.content ?? ''}`;
	}

	await thread.send(message);
	await thread.members.add(user);
}

async function createNotificationThread(channel: BaseGuildTextChannel, user: User): Promise<ThreadChannel> {
	const threadSettings: GuildTextThreadCreateOptions<AllowedThreadTypeForTextChannel> = {
		name: 'notifications',
		reason: `Creating new notification thread for <@${user.id}>`,
		autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
		type: ChannelType.PrivateThread
	};

	const thread = await channel.threads.create(threadSettings);
	await thread.setLocked(true);
	await thread.setInvitable(false);
	await thread.send('I\'ve created this thread because I couldn\'t DM you!');
	await NotificationThread.create({ user_id: user.id, thread_id: thread.id });

	return thread;
}
