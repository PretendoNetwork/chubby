import { AuditLogEvent, EmbedBuilder } from 'discord.js';
import { sendEventLogMessage } from '@/util';
import type { Guild, User, GuildAuditLogsEntry } from 'discord.js';

export default async function guildAuditLogEntryCreateHandler(auditLogEntry: GuildAuditLogsEntry, guild: Guild): Promise<void> {
	switch (auditLogEntry.action) { 
		case AuditLogEvent.MemberUpdate: {

			// * Unsure why just checking the action type doesn't narrow the type here, probably too much type inference going on?
			const user = (auditLogEntry as unknown as GuildAuditLogsEntry<AuditLogEvent.MemberUpdate>).target;
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
				if (timeoutChange.new && timeoutChange.new && typeof timeoutChange.new === 'string') {
					const timeout = new Date(timeoutChange.new);
					await handleMemberTimedOut(guild, user, executor, auditLogEntry.reason, timeout);
				}
			}

			// * This checks that a user has changed their name
			const nickChange = auditLogEntry.changes.find(change => change.key === 'nick');
			// * The types here should always be correct, but I have no idea how to convince the discord.js types of that...
			if (nickChange && typeof nickChange.new === 'string' && (nickChange.old === undefined || typeof nickChange.old === 'string')) {
				await handleMemberNicknameChange(guild, user, nickChange.old, nickChange.new);
			}

			break;
		}
		case AuditLogEvent.MemberKick: {
			await handleMemberKick(auditLogEntry, guild);
			break;
		}
		case AuditLogEvent.MemberBanAdd: {
			await handleMemberBanAdd(auditLogEntry, guild);
			break;
		}
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

	await sendEventLogMessage(guild, null, embed);
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

async function handleMemberKick(auditLogEntry: GuildAuditLogsEntry, guild: Guild): Promise<void> {
	// * Unsure why just checking the action type doesn't narrow the type here, probably too much type inference going on?
	const user = (auditLogEntry as unknown as GuildAuditLogsEntry<AuditLogEvent.MemberKick>).target;
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

	await sendEventLogMessage(guild, null, embed);
}

async function handleMemberBanAdd(auditLogEntry: GuildAuditLogsEntry, guild: Guild): Promise<void> {
	// * Unsure why just checking the action type doesn't narrow the type here, probably too much type inference going on?
	const user = (auditLogEntry as unknown as GuildAuditLogsEntry<AuditLogEvent.MemberBanAdd>).target;
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

	await sendEventLogMessage(guild, null, embed);
}
