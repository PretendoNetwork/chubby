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
	warningListEmbed.setTitle('User Warnings :thumbsdown:');
	warningListEmbed.setColor(0xFFA500);

	for (const userId of userIds) {
		const member = await interaction.guild.members.fetch(userId);
		const user = member.user;

		const modLogEmbed = new Discord.MessageEmbed();

		modLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
		modLogEmbed.setTimestamp(Date.now());
		modLogEmbed.setTitle('Event Type: _Member Warned_'); // Default type
		modLogEmbed.setFields( // Default fields
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
				value: reason
			},
			{
				name: 'From bot /warn command',
				value: 'true'
			}
		);
		modLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});

		const { count, rows } = await Warnings.findAndCountAll({
			where: {
				user_id: member.id
			}
		});

		const totalWarnings = count+1;

		let punishmentEmbed;
		let isKick;
		let isBan;

		if (totalWarnings === 3) { // 2 previous warnings, this would be the 3rd strike
			modLogEmbed.setColor(0xEF7F31);
			modLogEmbed.setTitle('Event Type: _Member Kicked_');

			punishmentEmbed = new Discord.MessageEmbed();

			punishmentEmbed.setTitle('Punishment Details');
			punishmentEmbed.setDescription('You have been kicked from the Pretendo Network server. You may rejoin after reviewing the details of the kick below');
			punishmentEmbed.setColor(0xEF7F31);
			punishmentEmbed.setTimestamp(Date.now());
			punishmentEmbed.setAuthor({
				name: `Kicked by: ${executingMember.user.tag}`,
				iconURL: executingMember.user.avatarURL()
			});
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
			modLogEmbed.setColor(0xF24E43);
			modLogEmbed.setTitle('Event Type: _Member Banned_');

			punishmentEmbed = new Discord.MessageEmbed();

			punishmentEmbed.setTitle('Punishment Details');
			punishmentEmbed.setDescription('You have been banned from the Pretendo Network server. You may not rejoin at this time, and an appeal may not be possible\nYou may review the details of your ban below');
			punishmentEmbed.setColor(0xF24E43);
			punishmentEmbed.setTimestamp(Date.now());
			punishmentEmbed.setAuthor({
				name: `Banned by: ${executingMember.user.tag}`,
				iconURL: executingMember.user.avatarURL()
			});
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
					value: 'This ban was the result of being warned 4 times. Below is a list of all previous warnings'
				}
			);

			isBan = true;
		}

		await util.sendModLogMessage(guild, null, modLogEmbed);

		if (punishmentEmbed) {
			const pastWarningsEmbed = new Discord.MessageEmbed();
			pastWarningsEmbed.setTitle('Past Warnings');
			pastWarningsEmbed.setDescription('For clarifty purposes here is a list of your past warnings');
			pastWarningsEmbed.setColor(0xEF7F31);
			pastWarningsEmbed.setTimestamp(Date.now());
			pastWarningsEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});

			for (let i = 0; i < rows.length; i++) {
				const warning = rows[i];
				const warningBy = await interaction.client.users.fetch(warning.admin_user_id);

				pastWarningsEmbed.addFields(
					{
						name: `${util.ordinal(i + 1)} Warning`,
						value: warning.reason
					},
					{
						name: 'Punished By',
						value: warningBy.tag,
						inline: true
					},
					{
						name: 'Date',
						value: warning.timestamp.toLocaleDateString(),
						inline: true
					}
				);
			}

			await member.send({
				embeds: [punishmentEmbed, pastWarningsEmbed]
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
			} else {
				// ???
			}
		} else {
			punishmentEmbed = new Discord.MessageEmbed();

			punishmentEmbed.setTitle('Warning');
			punishmentEmbed.setDescription('You have been issued a warning.\nYou may review the details of your warning below');
			punishmentEmbed.setColor(0xF24E43);
			punishmentEmbed.setTimestamp(Date.now());
			punishmentEmbed.setAuthor({
				name: `Warned by: ${executingMember.user.tag}`,
				iconURL: executingMember.user.avatarURL()
			});
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
				embeds: [punishmentEmbed]
			}).catch(() => console.log('Failed to DM user'));
		}

		await Warnings.create({
			user_id: member.id,
			admin_user_id: executingMember.id,
			reason: reason
		});

		warningListEmbed.addField(`${member.user.username}'s warnings`, totalWarnings.toString(), true);
	}

	await interaction.editReply({ embeds: [warningListEmbed], ephemeral: true });
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
