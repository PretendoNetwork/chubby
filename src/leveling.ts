import { getDB, getDBList } from '@/db';
import { User } from '@/models/users';
import { EmbedBuilder } from 'discord.js';
import { sendEventLogMessage } from '@/util';
import type { GuildMember, Message } from 'discord.js';

export async function handleLeveling(message: Message): Promise<void> {
	const levelingChannelBlacklist = getDBList('leveling.channels-blacklist');
	if (levelingChannelBlacklist.includes(message.channelId)) {
		return;
	}

	const supporterRoleId = getDB().get('roles.supporter');
	const supporterRole = supporterRoleId && (await message.guild?.roles.fetch(supporterRoleId));
	if (!supporterRole) {
		console.log('Missing supporter role!');
		return;
	}
	const trustedRoleId = getDB().get('roles.trusted');
	const trustedRole = trustedRoleId && (await message.guild?.roles.fetch(trustedRoleId));
	if (!trustedRole) {
		console.log('Missing trusted role!');
		return;
	}

	const xpRequiredForTrusted = parseInt(getDB().get('leveling.xp-required-for-trusted') ?? '0');
	if (!xpRequiredForTrusted) {
		console.log('Missing amount of XP required for trusted role!');
		return;
	}
	const timeRequiredForTrusted = parseInt(getDB().get('leveling.days-required-for-trusted') ?? '0') * 24 * 60 * 60 * 1000;
	if (!timeRequiredForTrusted) {
		console.log('Missing number of days required for trusted role!');
		return;
	}

	let messageTimeout = parseInt(getDB().get('leveling.message-timeout-seconds') ?? '0') * 1000;
	if (!messageTimeout) {
		console.log('Missing leveling message timeout! Defaulting to 1 minute.');
		messageTimeout = 60 * 1000;
	}
	let supporterXpMultiplier = parseInt(getDB().get('leveling.supporter-xp-multiplier') ?? '0');
	if (!supporterXpMultiplier) {
		console.log('Missing supporter XP multiplier! Supporters will not earn extra XP.');
		supporterXpMultiplier = 1;
	}

	let user = await User.findOne({ where: { user_id: message.author.id } });
	if (!user) {
		user = await User.create({ user_id: message.author.id });
	}
	const joinDate = message.member?.joinedAt;
	if (!joinDate) {
		// * User has left, no point in tracking their XP
		return;
	}

	if (!user.trusted_time_start_date) {
		// * User has not used the leveling system yet, set their start date to their join date so they don't have to wait
		await user.update({ trusted_time_start_date: joinDate });
	}

	if (!user.last_xp_message_sent || message.createdAt.getTime() - user.last_xp_message_sent.getTime() > messageTimeout) {
		if (message.member?.roles.cache.has(supporterRoleId)) {
			user.xp += supporterXpMultiplier;
		} else {
			user.xp += 1;
		}
		user.last_xp_message_sent = message.createdAt;
		await user.save();
	}

	if (
		user.xp >= xpRequiredForTrusted &&
		user.trusted_time_start_date && // Should always be set at this point, here for TypeScript
		new Date().getTime() - user.trusted_time_start_date.getTime() > timeRequiredForTrusted &&
		!message.member?.roles.cache.has(trustedRoleId)
	) {
		await message.member?.roles.add(trustedRole, 'User has earned the trusted role through the leveling system.');

		const guild = await message.guild!.fetch();

		const notificationEmbed = new EmbedBuilder();
		notificationEmbed.setColor(0x65b540);
		notificationEmbed.setTitle('Congratulations, you have become trusted in Pretendo!');
		notificationEmbed.setDescription(
			`Hello <@${message.author.id}>! You have been given the trusted role in the Pretendo Network Discord server.\n\n` +
				'The trusted role is automatically given to users who have been active in the server for a while. **You are now allowed to send images, link embeds, and other media in all channels.**'
		);
		notificationEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()!
		});
		try {
			//TODO - Switch this to the new DM/notification channel system
			await message.author.send({
				embeds: [notificationEmbed]
			});
		} catch (err) {
			console.log('Failed to DM user');
		}

		const eventLogEmbed = new EmbedBuilder();
		eventLogEmbed.setColor(0x65b540);
		eventLogEmbed.setTitle('Event Type: _User Trusted_');
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
			iconURL: message.guild!.iconURL()!
		});
		await sendEventLogMessage(guild, null, eventLogEmbed);
	}
}

export async function untrustUser(member: GuildMember, newStartDate: Date): Promise<void> {
	const trustedRoleId = getDB().get('roles.trusted');
	const trustedRole = trustedRoleId && (await member.guild.roles.fetch(trustedRoleId));
	if (!trustedRole) {
		console.log('Missing trusted role!');
		return;
	}

	let user = await User.findOne({ where: { user_id: member.id } });
	if (!user) {
		user = await User.create({ user_id: member.id });
	}

	const beforeXp = user.xp;
	const beforeStartDate = user.trusted_time_start_date;

	await user.update({ xp: 0, trusted_time_start_date: newStartDate });
	await member.roles.remove(trustedRoleId, 'User has lost the trusted role due to a moderator action.');

	const eventLogEmbed = new EmbedBuilder();
	eventLogEmbed.setColor(0xb54065);
	eventLogEmbed.setTitle('Event Type: _User Untrusted_');
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
