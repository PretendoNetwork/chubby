const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Timeouts = require('../models/timeouts');
const util = require('../util');

/**
 * 
 * @param {Discord.CommandInteraction} interaction
 */
async function timeoutHandler(interaction) {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild.fetch();
	const executingMember = await interaction.member.fetch();
	const executor = executingMember.user;
	const users = interaction.options.getString('users');
	const reason = interaction.options.getString('reason');

	const timestampOfTimeout = Date.now();

	const userIds = [...new Set(Array.from(users.matchAll(Discord.MessageMentions.USERS_PATTERN), match => match[1]))];

	const timeoutsListEmbed = new Discord.MessageEmbed();
	timeoutsListEmbed.setTitle('User Timeouts :thumbsdown:');
	timeoutsListEmbed.setColor(0xFFA500);

	for (const userId of userIds) {
		const member = await interaction.guild.members.fetch(userId);
		const user = member.user;

		const eventLogEmbed = new Discord.MessageEmbed();

		eventLogEmbed.setColor(0xF24E43);
		eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
		eventLogEmbed.setTimestamp(Date.now());
		eventLogEmbed.setTitle('Event Type: _Member Timed out_');
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
				name: 'Reason',
				value: reason
			},
			{
				name: 'From bot /timeout command',
				value: true
			}
		);
		eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});

		await util.sendEventLogMessage(guild, null, eventLogEmbed);

		const { count, rows } = await Timeouts.findAndCountAll({
			where: {
				user_id: member.id
			}
		});

		const sendMemberEmbeds = [];

		const timeoutEmbed = new Discord.MessageEmbed();

		timeoutEmbed.setTitle('Punishment Details');
		timeoutEmbed.setDescription(`You are currently muted in the Pretendo Network server. Your timeout will end in ${(Date.now() - timestampOfTimeout) - command.options[2].toString().replace(/[A-Za-z]+/, '')}, and an appeal may not be possible\nYou may review the details of your timeout below`);
		timeoutEmbed.setColor(0xF24E43);
		timeoutEmbed.setTimestamp(Date.now());
		timeoutEmbed.setAuthor({
			name: `Timed out by: ${executingMember.user.tag}`,
			iconURL: executingMember.user.avatarURL()
		});
		timeoutEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});
		timeoutEmbed.setFields({
			name: 'Timeout Reason',
			value: reason
		});

		sendMemberEmbeds.push(timeoutEmbed);

		if (count > 0) {
			const pastTimeoutsEmbed = new Discord.MessageEmbed();

			pastTimeoutsEmbed.setTitle('Past Timeouts');
			pastTimeoutsEmbed.setDescription('For clarifty purposes here is a list of your past timeouts');
			pastTimeoutsEmbed.setColor(0xEF7F31);
			pastTimeoutsEmbed.setTimestamp(Date.now());
			pastTimeoutsEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});

			for (let i = 0; i < rows.length; i++) {
				const timeout = rows[i];
				const timedoutBy = await interaction.client.users.fetch(timeout.admin_user_id);

				pastTimeoutsEmbed.addFields(
					{
						name: `${util.ordinal(i + 1)} Timeout`,
						value: timeout.reason
					},
					{
						name: 'Punished By',
						value: timedoutBy.tag,
						inline: true
					},
					{
						name: 'Date',
						value: timeout.timestamp.toLocaleDateString(),
						inline: true
					}
				);
			}

			sendMemberEmbeds.push(pastTimeoutsEmbed);
		}
    
		await member.send({
			embeds: sendMemberEmbeds
		}).catch(() => console.log('Failed to DM user'));

		await member.timeout({
			reason
		});

		await Timeouts.create({
			user_id: member.id,
			admin_user_id: executingMember.id,
			reason: reason
		});

		timeoutsListEmbed.addField(`${member.user.username}'s timeouts`, (count + 1).toString(), true);
	}

	await interaction.editReply({ embeds: [timeoutsListEmbed], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultPermission(false)
	.setName('timeout')
	.setDescription('Mutes user(s)')
	.addStringOption(option => {
		return option.setName('users')
			.setDescription('User(s) to timeout')
			.setRequired(true);
	})
	.addStringOption(option => {
		return option.setName('length')
			.setDescription('Length of mute')
			.setRequired(true);
	})
	.addStringOption(option => {
		return option.setName('reason')
			.setDescription('Reason for the timeout')
			.setRequired(true);
	});

module.exports = {
	name: command.name,
	handler: timeoutHandler,
	deploy: command.toJSON()
};