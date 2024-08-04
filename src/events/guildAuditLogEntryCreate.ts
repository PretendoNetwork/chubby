import { AuditLogEvent, EmbedBuilder } from 'discord.js';
import { sendEventLogMessage, sendModLogMessage } from '@/util';
import type { Guild, User, GuildAuditLogsEntry } from 'discord.js';

export default async function guildAuditLogEntryCreateHandler(auditLogEntry: GuildAuditLogsEntry, guild: Guild): Promise<void> {
	if (logIsForEvent(auditLogEntry, AuditLogEvent.MemberUpdate)) {
		const user = auditLogEntry.target;
		if (!user) {
			return;
		}

		const executor = auditLogEntry.executor;
		if (!executor) {
			return;
		}

		// * This checks that a user was timed out
		const timeoutChange = auditLogEntry.changes.find(change => change.key === 'communication_disabled_until');
		if (timeoutChange) {
			// * The types here should always be correct, but I have no idea how to convince the discord.js types of that...
			if (timeoutChange.new && typeof timeoutChange.new === 'string') {
				const timeout = new Date(timeoutChange.new);
				await handleMemberTimedOut(guild, user, executor, auditLogEntry.reason, timeout);
			}
		}

		// * This checks that a user has changed their name
		const nickChange = auditLogEntry.changes.find(change => change.key === 'nick');
		// * The types here should always be correct, but I have no idea how to convince the discord.js types of that...
		if (nickChange && isStringOrUndefined(nickChange.old) && isStringOrUndefined(nickChange.new)) {
			await handleMemberNicknameChange(guild, user, nickChange.old, nickChange.new);
		}
	} else if (logIsForEvent(auditLogEntry, AuditLogEvent.MemberKick)) {
		await handleMemberKick(auditLogEntry, guild);
	} else if (logIsForEvent(auditLogEntry, AuditLogEvent.MemberBanAdd)) {
		await handleMemberBanAdd(auditLogEntry, guild);
	}
}

async function handleMemberTimedOut(guild: Guild, user: User, executor: User, reason: string | null, timeout: Date): Promise<void> {
	const embed = new EmbedBuilder();

	embed.setColor(0xC0C0C0);
	embed.setDescription('――――――――――――――――――――――――――――――――――');
	embed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL() as string
	});

	embed.setTitle('Event Type: _Member Timedout_');

	embed.setFields(
		{
			name: 'User',
			value: `<@${user.id}>`
		},
		{
			name: 'User ID',
			value: user.id
		},
		{
			name: 'Executor',
			value: `<@${executor.id}>`
		},
		{
			name: 'Executor User ID',
			value: executor.id
		},
		{
			name: 'Reason',
			value: reason ?? 'No reason given'
		},
		{
			name: 'Disabled Until',
			value: `<t:${Math.trunc(timeout.getTime() / 1000)}>`
		}
	);

	await sendModLogMessage(guild, embed);
}

async function handleMemberNicknameChange(guild: Guild, user: User, oldName?: string, newName?: string): Promise<void> {
	const embed = new EmbedBuilder();

	embed.setColor(0xC0C0C0);
	embed.setDescription('――――――――――――――――――――――――――――――――――');
	embed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL() as string
	});

	embed.setTitle('Event Type: _Member Nickname Update_');

	embed.setFields(
		{
			name: 'User',
			value: `<@${user.id}>`
		},
		{
			name: 'User ID',
			value: user.id
		},
		{
			name: 'Old Nickname',
			value: oldName ?? '(No Nickname)',
			inline: true
		},
		{
			name: 'New Nickname',
			value: newName ?? '(No Nickname)',
			inline: true
		}
	);

	await sendEventLogMessage(guild, null, embed);
}

async function handleMemberKick(auditLogEntry: GuildAuditLogsEntry<AuditLogEvent.MemberKick>, guild: Guild): Promise<void> {
	const user = auditLogEntry.target;
	if (!user) {
		return;
	}

	const executor = auditLogEntry.executor;
	// * If the executor is Chubby, then this will have been logged elsewhere
	if (!executor || executor.id === guild.members.me!.id) {
		return;
	}

	const embed = new EmbedBuilder();

	embed.setColor(0xEF7F31);
	embed.setDescription('――――――――――――――――――――――――――――――――――');
	embed.setTimestamp(Date.now());
	embed.setTitle('Event Type: _Member Kicked_');
	embed.setFields(
		{
			name: 'User',
			value: `<@${user.id}>`
		},
		{
			name: 'User ID',
			value: user.id
		},
		{
			name: 'Executor',
			value: `<@${executor.id}>`
		},
		{
			name: 'Executor User ID',
			value: executor.id
		},
		{
			name: 'Reason',
			value: auditLogEntry.reason ?? 'No reason given'
		}
	);
	embed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL()!
	});

	await sendModLogMessage(guild, embed);
}

async function handleMemberBanAdd(auditLogEntry: GuildAuditLogsEntry<AuditLogEvent.MemberBanAdd>, guild: Guild): Promise<void> {
	const user = auditLogEntry.target;
	if (!user) {
		return;
	}

	const executor = auditLogEntry.executor;
	// * If the executor is Chubby, then this will have been logged elsewhere
	if (!executor || executor.id === guild.members.me!.id) {
		return;
	}

	const embed = new EmbedBuilder();

	embed.setColor(0xF24E43);
	embed.setDescription('――――――――――――――――――――――――――――――――――');
	embed.setTimestamp(Date.now());
	embed.setTitle('Event Type: _Member Banned_');
	embed.setFields(
		{
			name: 'User',
			value: `<@${user.id}>`
		},
		{
			name: 'User ID',
			value: user.id
		},
		{
			name: 'Executor',
			value: `<@${executor.id}>`
		},
		{
			name: 'Executor User ID',
			value: executor.id
		},
		{
			name: 'Reason',
			value: auditLogEntry.reason ?? 'No reason given'
		}
	);
	embed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL()!
	});

	await sendModLogMessage(guild, embed);
}

function logIsForEvent<EventType extends AuditLogEvent>(log: GuildAuditLogsEntry, eventType: EventType): log is GuildAuditLogsEntry<EventType> {
	return log.action === eventType;
}

function isStringOrUndefined(input: any): input is string | undefined {
	return input === undefined || typeof input === 'string';
}
