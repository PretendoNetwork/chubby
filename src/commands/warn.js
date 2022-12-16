const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Warnings = require('../models/warnings');
const Kicks = require('../models/kicks');
const Bans = require('../models/bans');
const util = require('../util');

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function warnHandler(interaction) {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild.fetch();
	const executingMember = await interaction.member.fetch();
	const executor = executingMember.user;
	const users = interaction.options.getString('users');
	const reason = interaction.options.getString('reason');

	const userIds = [...new Set(Array.from(users.matchAll(Discord.MessageMentions.USERS_PATTERN), match => match[1]))];

	const warningListEmbed = new Discord.MessageEmbed();
	warningListEmbed.setTitle('User Warnings');
	warningListEmbed.setColor(0xffc800);

	let image;

	for (const userId of userIds) {
		const member = await interaction.guild.members.fetch(userId);
		const user = member.user;

		// Checks if they're above/equal to the executor
		if (member.roles.highest.position >= executingMember.roles.highest.position) {
			await interaction.editReply(`You cannot warn ${member.username} as they have a higher role compared to you.`);
			return;
		}

		// Creates mod logs
		const eventLogEmbed = new Discord.MessageEmbed();

		eventLogEmbed.setAuthor({
			name: user.tag,
			iconURL: user.avatarURL()
		});
		eventLogEmbed.setColor(0xffc800);
		eventLogEmbed.setDescription(`${user.username} has been warned in Pretendo by ${executor.username}`);
		image = new Discord.MessageAttachment('./src/images/mod/mod-warn.png');
		eventLogEmbed.setThumbnail('attachment://mod-warn.png');
		eventLogEmbed.setTimestamp(Date.now());
		eventLogEmbed.setTitle('_Member Warned_'); // Default type
		eventLogEmbed.setFields( // Default fields
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
				name: 'From Bot',
				value: 'true'
			}
		);
		eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});

		const { count } = await Warnings.findAndCountAll({
			where: {
				user_id: member.id
			}
		});

		const totalWarnings = count+1;

		let punishmentEmbed;
		let isKick;
		let isBan;

		if (totalWarnings === 3) { // 2 previous warnings, this would be the 3rd strike
			eventLogEmbed.setColor(0xdd6c02);
			eventLogEmbed.setTitle('_Member Kicked_');
			eventLogEmbed.setDescription(`${user.username} has been kicked from Pretendo by ${executor.username}`);
			image = new Discord.MessageAttachment('./src/images/mod/mod-kick.png');
			eventLogEmbed.setThumbnail('attachment://mod-kick.png');

			punishmentEmbed = new Discord.MessageEmbed();

			punishmentEmbed.setTitle('_Member Kicked_');
			punishmentEmbed.setDescription('You have been kicked from the Pretendo Network server. You may rejoin after reviewing the details of the kick below');
			punishmentEmbed.setThumbnail('attachment://mod-kick.png');
			punishmentEmbed.setColor(0xdd6c02);
			punishmentEmbed.setTimestamp(Date.now());
			punishmentEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});
			punishmentEmbed.setFields(
				{
					name: 'Kick Reason',
					value: reason
				},
				{
					name: 'From warnings',
					value: 'This kick was the result of being warned 3 times. Be aware that a 4th warning will result in a ban'
				}
			);

			isKick = true;
		}

		if (totalWarnings >= 4) { // At least 3 previous warnings. They were kicked already, this is a ban
			eventLogEmbed.setColor(0xa30000);
			eventLogEmbed.setTitle('_Member Banned_');
			eventLogEmbed.setDescription(`${user.username} has been banned from Pretendo by ${executor.username}`);
			image = new Discord.MessageAttachment('./src/images/mod/mod-ban.png');
			eventLogEmbed.setThumbnail('attachment://mod-ban.png');

			punishmentEmbed = new Discord.MessageEmbed();

			punishmentEmbed.setTitle('_Member Banned_');
			punishmentEmbed.setDescription('You have been banned from the Pretendo Network server. You may not rejoin at this time, and an appeal may not be possible\nYou may review the details of your ban below');
			punishmentEmbed.setThumbnail('attachment://mod-ban.png');
			punishmentEmbed.setColor(0xa30000);
			punishmentEmbed.setTimestamp(Date.now());
			punishmentEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});
			punishmentEmbed.setFields(
				{
					name: 'Ban Reason',
					value: reason
				},
				{
					name: 'From warnings',
					value: 'This ban was the result of being warned 4 times'
				}
			);

			isBan = true;
		}

		await util.sendEventLogMessage('channels.mod-logs', guild, null, eventLogEmbed, image, null);

		if (punishmentEmbed) {
			await member.send({
				embeds: [punishmentEmbed],
				files: [image]
			}).catch(() => console.log('Failed to DM user'));

			if (isKick) {
				await member.kick(reason);

				await Kicks.create({
					user_id: member.id,
					admin_user_id: executingMember.id,
					reason: reason,
					from_warning: true
				});
			} else if (isBan) {
				await member.ban({
					reason
				});

				await Bans.create({
					user_id: member.id,
					admin_user_id: executingMember.id,
					reason: reason,
					from_warning: true
				});
			}
		} else {
			punishmentEmbed = new Discord.MessageEmbed();

			punishmentEmbed.setTitle('_Member Warned_');
			punishmentEmbed.setDescription('You have been issued a warning.\nYou may review the details of your warning below');
			image = new Discord.MessageAttachment('./src/images/mod/mod-warn.png');
			punishmentEmbed.setThumbnail('attachment://mod-warn.png');
			punishmentEmbed.setColor(0xffc800);
			punishmentEmbed.setTimestamp(Date.now());
			punishmentEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});
			punishmentEmbed.setFields(
				{
					name: 'Reason',
					value: reason
				},
				{
					name: 'Total Warnings',
					value: totalWarnings.toString()
				},
				{
					name: 'Warnings Left Until Kick',
					value: Math.max(0, 3 - totalWarnings).toString()
				},
				{
					name: 'Warnings Left Until Ban',
					value: Math.max(0, 4 - totalWarnings).toString()
				}
			);

			await member.send({
				embeds: [punishmentEmbed],
				files: [image]
			}).catch(() => console.log('Failed to DM user'));
		}

		await Warnings.create({
			user_id: member.id,
			admin_user_id: executingMember.id,
			reason: reason
		});

		warningListEmbed.setDescription(`${user.username} has been successfully warned, here is their previous warns`)
		warningListEmbed.addField(`${member.user.username}'s warns`, (count + 1).toString(), true);
		warningListEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});
		warningListEmbed.setTimestamp(Date.now());
	}

	image = new Discord.MessageAttachment('./src/images/mod/mod-warn.png');
	warningListEmbed.setThumbnail('attachment://mod-warn.png');
	await interaction.editReply({ embeds: [warningListEmbed], files: [image], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultPermission(false)
	.setName('warn')
	.setDescription('Warn user(s)')
	.addStringOption(option => {
		return option.setName('users')
			.setDescription('User(s) to warn')
			.setRequired(true);
	})
	.addStringOption(option => {
		return option.setName('reason')
			.setDescription('Reason for the warning')
			.setRequired(true);
	});

module.exports = {
	name: command.name,
	handler: warnHandler,
	deploy: command.toJSON()
};