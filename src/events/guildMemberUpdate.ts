import { AuditLogEvent, EmbedBuilder } from 'discord.js';
import { sendEventLogMessage } from '@/util';
import type { GuildMember, PartialGuildMember } from 'discord.js';

export async function guildMemberUpdateHandler(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember): Promise<void> {
	if (oldMember.user.bot) {
		return;
	}

	const member = newMember;
	const guild = member.guild;
	const user = member.user;

	const auditLogs = await guild.fetchAuditLogs({
		limit: 1,
		type: AuditLogEvent.MemberUpdate
	});

	const latestLog = auditLogs.entries.first();
	if (!latestLog) {
		return;
	}

	const { executor } = latestLog;

	const eventLogEmbed = new EmbedBuilder();

	eventLogEmbed.setColor(0xC0C0C0);
	eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
	eventLogEmbed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL() as string
	});

	if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
		eventLogEmbed.setTitle('Event Type: _Member Timedout_');

		eventLogEmbed.setFields(
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
				value: `<@${executor!.id}>`
			},
			{
				name: 'Executor User ID',
				value: executor!.id
			},
			{
				name: 'Reason',
				value: latestLog.reason ?? ''
			},
			{
				name: 'Disabled Until (UTC)',
				value: newMember?.communicationDisabledUntil?.toUTCString() ?? ''
			}
		);

		await sendEventLogMessage(guild, null, eventLogEmbed);
	}

	if (oldMember.nickname !== newMember.nickname) {
		eventLogEmbed.setTitle('Event Type: _Member Nickname Update_');

		eventLogEmbed.setFields(
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
				value: `<@${executor!.id}>`
			},
			{
				name: 'Executor User ID',
				value: executor!.id
			},
			{
				name: 'Old Nickname',
				value: oldMember.nickname || oldMember.user.username + '(No Nickname)',
				inline: true
			},
			{
				name: 'New Nickname',
				value: newMember.nickname || oldMember.user.username + '(No Nickname)',
				inline: true
			}
		);

		await sendEventLogMessage(guild, null, eventLogEmbed);
	}
}
