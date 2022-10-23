const Discord = require('discord.js');
const ms = require('ms');
const { SlashCommandBuilder } = require('@discordjs/builders');
const mutes = require('../models/mutes');
const db = require('../db');
const util = require('../util');

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
 async function muteHandler(interaction) {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild.fetch();
	const executingMember = await interaction.member.fetch();
	const executor = executingMember.user;
	const users = interaction.options.getString('users');
	const reason = interaction.options.getString('reasoning');
	let timeamount = interaction.options.getString('time');
	const mutedRoleId = db.getDB().get('roles.muted');
	const mutedRole = mutedRoleId && await guild.roles.fetch(mutedRoleId);

	if (timeamount == null) {timeamount = "Permanently"};

	const userIds = [...new Set(Array.from(users.matchAll(Discord.MessageMentions.USERS_PATTERN), match => match[1]))];

	const muteListEmbed = new Discord.MessageEmbed();
	muteListEmbed.setTitle('User Mute :zipper_mouth:');
	muteListEmbed.setColor(0xFFA500);

	for (const userId of userIds) {
		const member = await interaction.guild.members.fetch(userId);
		const user = member.user;

		const eventLogEmbed = new Discord.MessageEmbed();

		eventLogEmbed.setColor(0xF24E43);
		eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
		eventLogEmbed.setTimestamp(Date.now());
		eventLogEmbed.setTitle('Event Type: _Member Muted_');
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
				value: `<@${executor.id}>`
			},
			{
				name: 'Executor User ID',
				value: executor.id
			},
			{
				name: 'Amount of time muted',
				value: timeamount
			},
			{
				name: 'Reasoning of mute',
				value: reason
			}
		);
		eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});

		await util.sendEventLogMessage(guild, null, eventLogEmbed);

		const sendMemberEmbeds = [];

		const muteEmbed = new Discord.MessageEmbed();

		muteEmbed.setTitle('Punishment Details');
		muteEmbed.setDescription('You have been muted in the Pretendo Network server. You may not speak inside the server at this time, and an appeal may not be possible\nYou may review the details of your mute below');
		muteEmbed.setColor(0xF24E43);
		muteEmbed.setTimestamp(Date.now());
		muteEmbed.setAuthor({
			name: `Muted by: ${executingMember.user.tag}`,
			iconURL: executingMember.user.avatarURL()
		});
		muteEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});
		muteEmbed.setFields({
			name: 'Mute Time',
			value: timeamount
		},
		{
			name: 'Reasoning of the mute',
			value: reason
		});

		sendMemberEmbeds.push(muteEmbed);

		await member.send({
			embeds: sendMemberEmbeds
		}).catch(() => console.log('Failed to DM user'));

		if (!mutedRole) {
			console.log('Missing muted role!');
		} else {
			await(member.roles.add(mutedRole));
		}

		if (timeamount !== "Permamently") {
			setTimeout(function(){
				member.roles.remove(mutedRole);
			}, ms(timeamount));
		}

		await mutes.create({
			user_id: member.id,
			admin_user_id: executingMember.id,
			timeamount: timeamount
		});

		muteListEmbed.addField(`${member.user.username}'s mute time is `, timeamount.toString(), true);
	}

	await interaction.editReply({ embeds: [muteListEmbed], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultPermission(false)
	.setName('mute')
	.setDescription('Mute user(s)')
	.addStringOption(option => {
		return option.setName('users')
			.setDescription('User(s) to mute')
			.setRequired(true);
	})
	.addStringOption(option => {
		return option.setName('reasoning')
			.setDescription('Reasoning of the mute')
			.setRequired(true);
	})
	.addStringOption(option => {
		return option.setName('time')
			.setDescription('Time of the mute (ex: 15s, 2 hrs, 14 days)')
			.setRequired(false);
	});

module.exports = {
	name: command.name,
	handler: muteHandler,
	deploy: command.toJSON()
};
