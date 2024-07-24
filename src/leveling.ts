import { EmbedBuilder } from 'discord.js';
import { getDB, getDBList } from '@/db';
import { User } from '@/models/users';
import { sendEventLogMessage } from '@/util';
import { sequelize } from '@/sequelize-instance';
import type { GuildMember, Message } from 'discord.js';

export async function handleLeveling(message: Message): Promise<void> {
	const levelingChannelBlacklist = getDBList('leveling.channels-blacklist');
	if (levelingChannelBlacklist.includes(message.channelId)) {
		return;
	}

	const supporterRoleID = getDB().get('roles.supporter');
	const supporterRole = supporterRoleID && (await message.guild?.roles.fetch(supporterRoleID));
	if (!supporterRole) {
		console.log('Missing supporter role!');
		return;
	}

	const trustedRoleID = getDB().get('roles.trusted');
	const trustedRole = trustedRoleID && (await message.guild?.roles.fetch(trustedRoleID));
	if (!trustedRole) {
		console.log('Missing trusted role!');
		return;
	}

	const xpRequiredForTrusted = parseInt(getDB().get('leveling.xp-required-for-trusted') ?? '');
	if (isNaN(xpRequiredForTrusted)) {
		console.log('Missing amount of XP required for trusted role!');
		return;
	}

	const timeRequiredForTrusted = parseInt(getDB().get('leveling.days-required-for-trusted') ?? '') * 24 * 60 * 60 * 1000;
	if (isNaN(timeRequiredForTrusted)) {
		console.log('Missing number of days required for trusted role!');
		return;
	}

	let messageTimeout = parseInt(getDB().get('leveling.message-timeout-seconds') ?? '') * 1000;
	if (isNaN(messageTimeout)) {
		console.log('Missing leveling message timeout! Defaulting to 1 minute.');
		messageTimeout = 60 * 1000;
	}

	let supporterXPMultiplier = parseInt(getDB().get('leveling.supporter-xp-multiplier') ?? '');
	if (isNaN(supporterXPMultiplier)) {
		console.log('Missing supporter XP multiplier! Supporters will not earn extra XP.');
		supporterXPMultiplier = 1;
	}

	const joinDate = message.member?.joinedAt;
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
		let xp = 1;
		if (message.member?.roles.cache.has(supporterRoleID)) {
			xp = supporterXPMultiplier;
		}

		const transaction = await sequelize.transaction();
		try {
			await user.reload({ transaction });
			user.xp += xp;
			user.last_xp_message_sent = message.createdAt;
			await user.save({ transaction });
			await transaction.commit();
		} catch (error) {
			await transaction.rollback();
			throw error;
		}
	}

	// * Check if the user should become trusted
	const timeSinceStartDate = new Date().getTime() - user.trusted_time_start_date.getTime();
	if (
		user.xp >= xpRequiredForTrusted &&
		timeSinceStartDate > timeRequiredForTrusted &&
		!message.member?.roles.cache.has(trustedRoleID)
	) {
		await message.member.roles.add(trustedRole, 'User has earned the trusted role through the leveling system.');

		const guild = await message.guild!.fetch();

		let description = `Hello <@${message.author.id}>! You have been given the trusted role in the Pretendo Network Discord server.`;
		description += '\n\n';
		description += 'The trusted role is automatically given to users who have been active in the server for a while. **You are now allowed to send images, link embeds, and other media in all channels.**';

		const notificationEmbed = new EmbedBuilder();
		notificationEmbed.setColor(0x65B540);
		notificationEmbed.setTitle('Congratulations, you have become trusted in Pretendo!');
		notificationEmbed.setDescription(description);
		notificationEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()!
		});

		try {
			//TODO - Switch this to the new DM/notification channel system
			await message.author.send({
				embeds: [notificationEmbed]
			});
		} catch (error) {
			console.log('Failed to DM user');
		}

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
			iconURL: message.guild!.iconURL()!
		});

		await sendEventLogMessage(guild, null, eventLogEmbed);
	}
}

export async function untrustUser(member: GuildMember, newStartDate: Date): Promise<void> {
	const trustedRoleID = getDB().get('roles.trusted');
	const trustedRole = trustedRoleID && (await member.guild.roles.fetch(trustedRoleID));
	if (!trustedRole) {
		console.log('Missing trusted role!');
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
