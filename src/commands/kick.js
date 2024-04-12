const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Kicks = require('../models/kicks');
const Bans = require('../models/bans');
const util = require('../util');

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function kickHandler(interaction) {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild.fetch();
	const executingMember = await interaction.member.fetch();
	const executor = executingMember.user;
	const users = interaction.options.getString('users');
	const reason = interaction.options.getString('reason');

	let modImage;

	const userIds = [...new Set(Array.from(users.matchAll(Discord.MessageMentions.USERS_PATTERN), match => match[1]))];

	const kicksListEmbed = new Discord.MessageEmbed();
	kicksListEmbed.setTitle('User Kicks');
	kicksListEmbed.setColor(0xdd6c02);

	for (const userId of userIds) {
		const member = await interaction.guild.members.fetch(userId);
		const user = member.user;

		// Checks if they're above/equal to the executor
		if (member.roles.highest.position >= executingMember.roles.highest.position) {
			await interaction.editReply(`You cannot kick ${user.username} as they have a higher role compared to you.`);
			return;
		}

		// Creates mod logs
		const eventLogEmbed = new Discord.MessageEmbed();

		eventLogEmbed.setAuthor({
			name: user.tag,
			iconURL: user.avatarURL()
		});
		eventLogEmbed.setTimestamp(Date.now());
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
				name: 'Moderator',
				value: `<@${executor.id}>`
			},
			{
				name: 'Moderator User ID',
				value: executor.id
			},
			{
				name: 'Reason',
				value: reason
			},
			{
				name: 'From `/kick`',
				value: 'true'
			}
		);
		eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});

		const { count } = await Kicks.findAndCountAll({
			where: {
				user_id: member.id
			}
		});

		let isKick;
		let isBan;

		const sendMemberEmbeds = [];

		if (count >= 2) { // Atleast 2 previous kicks, this would be the 3rd strike. Ban
			eventLogEmbed.setColor(0xa30000);
			eventLogEmbed.setTitle('_Member Banned_');
			eventLogEmbed.setDescription(`${user.username} has been banned from Pretendo by ${executor.username}`);
			modImage = new Discord.MessageAttachment('./src/images/mod/mod-ban.png');
			eventLogEmbed.setThumbnail('attachment://mod-ban.png');
			
			const banEmbed = new Discord.MessageEmbed();

			banEmbed.setTitle('_Member Banned_');
			banEmbed.setDescription('You have been banned from the Pretendo Network server. You may not rejoin at this time, and an appeal may not be possible\nYou may review the details of your ban below');
			banEmbed.setThumbnail('attachment://mod-ban.png');
			banEmbed.setColor(0xa30000);
			banEmbed.setTimestamp(Date.now());
			banEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});
			banEmbed.setFields(
				{
					name: 'Ban Reason',
					value: reason
				},
				{
					name: 'From kick',
					value: 'This ban was the result of being kicked 3 times'
				}
			);

			isBan = true;

			sendMemberEmbeds.push(banEmbed);
		} else { // Just kick
			eventLogEmbed.setColor(0xdd6c02);
			eventLogEmbed.setTitle('_Member Kicked_');
			eventLogEmbed.setDescription(`${user.username} has been kicked from Pretendo by ${executor.username}`);
			modImage = new Discord.MessageAttachment('./src/images/mod/mod-kick.png');
			eventLogEmbed.setThumbnail('attachment://mod-kick.png');

			const kickEmbed = new Discord.MessageEmbed();

			kickEmbed.setTitle('_Member Kicked_');
			kickEmbed.setDescription('You have been kicked from the Pretendo Network server. You may rejoin after reviewing the details of the kick below');
			kickEmbed.setThumbnail('attachment://mod-kick.png');
			kickEmbed.setColor(0xdd6c02);
			kickEmbed.setTimestamp(Date.now());
			kickEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});
			kickEmbed.setFields({
				name: 'Kick Reason',
				value: reason
			},
			{
				name: 'Amount Of Times Kicked',
				value: (count + 1).toString()
			});

			isKick = true;

			sendMemberEmbeds.push(kickEmbed);
		}

		await util.sendEventLogMessage('channels.mod-logs', guild, null, eventLogEmbed, modImage, null);

		await member.send({
			embeds: sendMemberEmbeds,
			files: [modImage]
		}).catch(() => console.log('Failed to DM user'));

		if (isKick) {
			await member.kick(reason);
		} else if (isBan) {
			await member.ban({
				reason
			});

			await Bans.create({
				user_id: member.id,
				admin_user_id: executingMember.id,
				reason: reason,
				from_kick: true
			});
		}

		await Kicks.create({
			user_id: member.id,
			admin_user_id: executingMember.id,
			reason: reason
		});

		kicksListEmbed.setDescription(`${user.username} has been successfully kicked`);
		kicksListEmbed.addField(`${member.user.username}'s kicks`, (count + 1).toString(), true);
		kicksListEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});
		kicksListEmbed.setTimestamp(Date.now());
	}

	modImage = new Discord.MessageAttachment('./src/images/mod/mod-kick.png');
	kicksListEmbed.setThumbnail('attachment://mod-kick.png');
	await interaction.editReply({ embeds: [kicksListEmbed], files: [modImage], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultPermission(false)
	.setName('kick')
	.setDescription('Kick user(s)')
	.addStringOption(option => {
		return option.setName('users')
			.setDescription('User(s) to kick')
			.setRequired(true);
	})
	.addStringOption(option => {
		return option.setName('reason')
			.setDescription('Reason for the kick')
			.setRequired(true);
	});


module.exports = {
	name: command.name,
	handler: kickHandler,
	deploy: command.toJSON()
};