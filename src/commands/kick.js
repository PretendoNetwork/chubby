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

	const userIds = [...new Set(Array.from(users.matchAll(Discord.MessageMentions.USERS_PATTERN), match => match[1]))];

	const kicksListEmbed = new Discord.MessageEmbed();
	kicksListEmbed.setTitle('User Kicks :wave:');
	kicksListEmbed.setColor(0xFFA500);

	for (const userId of userIds) {
		const member = await interaction.guild.members.fetch(userId);
		const user = member.user;

		const modLogEmbed = new Discord.MessageEmbed();

		modLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
		modLogEmbed.setTimestamp(Date.now());
		modLogEmbed.setFields(
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
				name: 'From bot /kick command',
				value: 'true'
			}
		);
		modLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});

		const { count, rows } = await Kicks.findAndCountAll({
			where: {
				user_id: member.id
			}
		});

		let isKick;
		let isBan;

		const sendMemberEmbeds = [];

		if (count >= 2) { // Atleast 2 previous kicks, this would be the 3rd strike. Ban
			modLogEmbed.setColor(0xF24E43);
			modLogEmbed.setTitle('Event Type: _Member Banned_');
			
			const banEmbed = new Discord.MessageEmbed();

			banEmbed.setTitle('Punishment Details');
			banEmbed.setDescription('You have been banned from the Pretendo Network server. You may not rejoin at this time, and an appeal may not be possible\nYou may review the details of your ban below');
			banEmbed.setColor(0xF24E43);
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
					value: 'This ban was the result of being kicked 3 times. Below is a list of all previous kicks'
				}
			);

			isBan = true;

			sendMemberEmbeds.push(banEmbed);
		} else { // Just kick
			modLogEmbed.setColor(0xEF7F31);
			modLogEmbed.setTitle('Event Type: _Member Kicked_');

			const kickEmbed = new Discord.MessageEmbed();

			kickEmbed.setTitle('Punishment Details');
			kickEmbed.setDescription('You have been kicked from the Pretendo Network server. You may rejoin after reviewing the details of the kick below');
			kickEmbed.setColor(0xEF7F31);
			kickEmbed.setTimestamp(Date.now());
			kickEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});
			kickEmbed.setFields({
				name: 'Kick Reason',
				value: reason
			});

			isKick = true;

			sendMemberEmbeds.push(kickEmbed);
		}

		await util.sendModLogMessage(guild, null, modLogEmbed);

		if (count > 0) {
			const pastKicksEmbed = new Discord.MessageEmbed();
			pastKicksEmbed.setTitle('Past Kicks');
			pastKicksEmbed.setDescription('For clarifty purposes here is a list of your past kicks');
			pastKicksEmbed.setColor(0xEF7F31);
			pastKicksEmbed.setTimestamp(Date.now());
			pastKicksEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});

			for (let i = 0; i < rows.length; i++) {
				const kick = rows[i];

				pastKicksEmbed.addFields(
					{
						name: `${util.ordinal(i + 1)} Kick`,
						value: kick.reason
					},
					{
						name: 'Date',
						value: kick.timestamp.toLocaleDateString(),
						inline: true
					}
				);
			}

			sendMemberEmbeds.push(pastKicksEmbed);
		}

		await member.send({
			embeds: sendMemberEmbeds
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
		} else {
			// ???
		}

		await Kicks.create({
			user_id: member.id,
			admin_user_id: executingMember.id,
			reason: reason
		});

		kicksListEmbed.addField(`${member.user.username}'s kicks`, (count + 1).toString(), true);
	}

	await interaction.editReply({ embeds: [kicksListEmbed], ephemeral: true });
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
