import { AuditLogEvent, EmbedBuilder } from 'discord.js';
import { sendEventLogMessage } from '@/util';
import type { PartialGuildMember, GuildMember } from 'discord.js';

export default async function guildMemberRemoveHandler(member: GuildMember | PartialGuildMember): Promise<void> {
	if (member.partial) {
		// * This should never happen as we don't opt into partial structures
		// * but we need this to be here to convince the compiler that the rest is safe
		return;
	}

	const guild = member.guild;
	const user = member.user;

	const auditLogs = await guild.fetchAuditLogs({
		limit: 10
	});

	const auditLog = auditLogs.entries
		.filter(log => log.action === AuditLogEvent.MemberBanAdd || log.action === AuditLogEvent.MemberKick)
		.filter(log => Date.now() - log.createdTimestamp < 2000)
		.find(log => log.targetId === member.id);

	if (auditLog) {
		// * If we found this audit log, it means that there's already going to be a
		// * more specific event log created for this user leaving (i.e. they were banned/kicked)
		return;
	}

	const eventLogEmbed = new EmbedBuilder();

	eventLogEmbed.setColor(0xC0C0C0);
	eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
	eventLogEmbed.setTimestamp(Date.now());
	eventLogEmbed.setTitle('Event Type: _Member Left_');
	eventLogEmbed.setFields(
		{
			name: 'User',
			value: `<@${user.id}>`
		},
		{
			name: 'User ID',
			value: user.id
		}
	);
	eventLogEmbed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL()!
	});

	await sendEventLogMessage(guild, null, eventLogEmbed);
}
