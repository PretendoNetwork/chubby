import { EmbedBuilder } from 'discord.js';
import { User } from '@/models/users';
import { getRoleFromSettings, sendEventLogMessage } from '@/util';
import { sequelize } from '@/sequelize-instance';
import { notifyUser } from '@/notifications';
import { getSetting } from '@/models/settings';
import type { GuildMember, Message } from 'discord.js';

export async function handleLeveling(message: Message): Promise<void> {
	const member = message.member;
	const messageGuild = message.guild;
	if (!member || !messageGuild) {
		return;
	}

	const levelingChannelBlacklist = await getSetting('leveling.channel-blacklist');
	if (levelingChannelBlacklist.includes(message.channelId)) {
		return;
	}

	const trustedRole = await getRoleFromSettings(messageGuild, 'trusted');
	const untrustedRole = await getRoleFromSettings(messageGuild, 'untrusted');
	if (!trustedRole || !untrustedRole) {
		return;
	}

	// * If the user has the trusted or untrusted role, do not give them XP
	// * - Untrusted users cannot be trusted, therefore they should not receive XP
	// * - Trusted users already have the trusted role, therefore they do not need to be given XP
	if (member.roles.cache.has(trustedRole.id) || member.roles.cache.has(untrustedRole.id)) {
		return;
	}

	const supporterRole = await getRoleFromSettings(messageGuild, 'supporter');

	const xpRequiredForTrusted = await getSetting('leveling.xp-required-for-trusted');
	const timeRequiredForTrusted = await getSetting('leveling.days-required-for-trusted') * 24 * 60 * 60 * 1000;

	let messageTimeout = await getSetting('leveling.message-timeout-seconds') * 1000;
	if (isNaN(messageTimeout)) {
		console.log('Missing leveling message timeout! Defaulting to 1 minute.');
		messageTimeout = 60 * 1000;
	}

	const messageXP = await getSetting('leveling.message-xp');
	const supporterXPMultiplier = await getSetting('leveling.supporter-xp-multiplier');

	const joinDate = member.joinedAt;
	if (!joinDate) {
		// * User has left, no point in tracking their XP
		return;
	}

	const [user] = await User.findOrCreate({
		where: {
			user_id: message.author.id
		},
		defaults: {
			user_id: message.author.id,
			trusted_time_start_date: joinDate
		}
	});

	if (!user.trusted_time_start_date) {
		// * User has not used the leveling system yet, set their start date to their join date so they don't have to wait
		user.trusted_time_start_date = joinDate;
		await user.save();
	}

	// * Check if this message should give XP
	if (!user.last_xp_message_sent || message.createdAt.getTime() - user.last_xp_message_sent.getTime() > messageTimeout) {
		let xp = messageXP;
		if (supporterRole && message.member.roles.cache.has(supporterRole.id)) {
			xp = supporterXPMultiplier;
		}

		await sequelize.transaction(async (t) => {
			await user.increment('xp', { by: xp, transaction: t });
			await user.update({ last_xp_message_sent: message.createdAt }, { transaction: t });
		});
		await user.reload();
	}

	// * Check if the user should become trusted
	const timeSinceStartDate = new Date().getTime() - user.trusted_time_start_date.getTime();
	if (
		user.xp >= xpRequiredForTrusted &&
		timeSinceStartDate > timeRequiredForTrusted &&
		!member.roles.cache.has(trustedRole.id)
	) {
		await message.member.roles.add(trustedRole, 'User has earned the trusted role through the leveling system.');

		const guild = await messageGuild.fetch();

		let description = `Hello <@${message.author.id}>! You have been given the Trusted role in the Pretendo Network Discord server.`;
		description += '\n\n';
		description += 'The Trusted role is automatically given to users who have been active in the server for a while. **You are now allowed to send images, link embeds, and other media in all channels. You are also now allowed access to the server\'s voice channels.**';

		const notificationEmbed = new EmbedBuilder();
		notificationEmbed.setColor(0x65B540);
		notificationEmbed.setTitle('Congratulations, you have become Trusted in Pretendo!');
		notificationEmbed.setDescription(description);
		notificationEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()!
		});

		notifyUser(guild, message.author, {
			embeds: [notificationEmbed]
		});

		const eventLogEmbed = new EmbedBuilder();
		eventLogEmbed.setColor(0x65B540);
		eventLogEmbed.setTitle('Event Type: _Member Trusted_');
		eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
		eventLogEmbed.setFields(
			{
				name: 'User',
				value: `<@${message.author.id}>`
			},
			{
				name: 'User ID',
				value: message.author.id
			},
			{
				name: 'User join date',
				value: `<t:${Math.floor(joinDate.getTime() / 1000)}>`
			},
			{
				name: 'Leveling started',
				value: `<t:${Math.floor(user.trusted_time_start_date.getTime() / 1000)}:R>`
			},
			{
				name: 'User XP',
				value: user.xp.toString()
			}
		);
		eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()!
		});

		await sendEventLogMessage(guild, null, eventLogEmbed);
	}
}

export async function untrustUser(member: GuildMember, newStartDate: Date): Promise<void> {
	const trustedRoleID = await getRoleFromSettings(member.guild, 'trusted');
	if (!trustedRoleID) {
		return;
	}

	const [user] = await User.findOrCreate({
		where: {
			user_id: member.id
		},
		defaults: {
			user_id: member.id
		}
	});

	const beforeXp = user.xp;
	const beforeStartDate = user.trusted_time_start_date;

	await user.update({
		xp: 0,
		trusted_time_start_date: newStartDate
	});
	await member.roles.remove(trustedRoleID, 'User has lost the trusted role due to a moderator action.');

	const eventLogEmbed = new EmbedBuilder();
	eventLogEmbed.setColor(0xB54065);
	eventLogEmbed.setTitle('Event Type: _Member Untrusted_');
	eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
	eventLogEmbed.setFields(
		{
			name: 'User',
			value: `<@${member.id}>`
		},
		{
			name: 'User ID',
			value: member.id
		},
		{
			name: 'User join date',
			value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}>` : 'Unknown'
		},
		{
			name: 'Leveling started (before untrust)',
			value: beforeStartDate ? `<t:${Math.floor(beforeStartDate.getTime() / 1000)}:R>` : 'User has not used leveling'
		},
		{
			name: 'User XP (before untrust)',
			value: beforeXp.toString()
		}
	);
	eventLogEmbed.setFooter({
		text: 'Pretendo Network',
		iconURL: member.guild.iconURL()!
	});
	await sendEventLogMessage(member.guild, null, eventLogEmbed);
}
