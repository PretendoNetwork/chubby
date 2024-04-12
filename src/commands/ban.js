const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Bans = require('../models/bans');
const util = require('../util');

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function banHandler(interaction) {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild.fetch();
	const executingMember = await interaction.member.fetch();
	const executor = executingMember.user;
	const users = interaction.options.getString('users');
	const reason = interaction.options.getString('reason');

	const userIds = [...new Set(Array.from(users.matchAll(Discord.MessageMentions.USERS_PATTERN), match => match[1]))];

	const bansListEmbed = new Discord.MessageEmbed();
	bansListEmbed.setTitle('User Bans');
	bansListEmbed.setColor(0xa30000);
	bansListEmbed.setThumbnail('attachment://mod-ban.png');

	const banImage = new Discord.MessageAttachment('./src/images/mod/mod-ban.png');

	for (const userId of userIds) {
		const member = await interaction.guild.members.fetch(userId);
		const user = member.user;

		// Checks if they're above/equal to the executor
		if (member.roles.highest.position >= executingMember.roles.highest.position) {
			await interaction.editReply(`You cannot ban ${user.username} as they have a higher role compared to you.`);
			return;
		}

		// Creates mod logs
		const eventLogEmbed = new Discord.MessageEmbed();

		eventLogEmbed.setAuthor({
			name: user.tag,
			iconURL: user.avatarURL()
		});
		eventLogEmbed.setColor(0xa30000);
		eventLogEmbed.setDescription(`${user.username} has been banned by ${executor.username}`);
		eventLogEmbed.setTimestamp(Date.now());
		eventLogEmbed.setTitle('_Member Banned_');
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
				name: 'From Bot',
				value: 'true'
			}
		);
		eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});
		eventLogEmbed.setThumbnail('attachment://mod-ban.png');

		await util.sendEventLogMessage('channels.mod-logs', guild, null, eventLogEmbed, banImage, null);
		
		const { count } = await Bans.findAndCountAll({
			where: {
				user_id: member.id
			}
		});
		
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
		banEmbed.setFields({
			name: 'Ban Reason',
			value: reason
		},
		{
			name: 'Amount Of Times Banned',
			value: (count + 1).toString()
		});

		await member.send({
			embeds: [banEmbed],
			files: [banImage]
		}).catch(() => console.log('Failed to DM user'));

		await member.ban({
			reason
		});

		await Bans.create({
			user_id: member.id,
			admin_user_id: executingMember.id,
			reason: reason
		});

		bansListEmbed.setDescription(`${user.username} has been successfully banned`);
		bansListEmbed.addField(`${member.user.username}'s bans`, (count + 1).toString(), true);
		bansListEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});
		bansListEmbed.setTimestamp(Date.now());

	}

	await interaction.editReply({ embeds: [bansListEmbed], files: [banImage], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultPermission(false)
	.setName('ban')
	.setDescription('Ban user(s)')
	.addStringOption(option => {
		return option.setName('users')
			.setDescription('User(s) to ban')
			.setRequired(true);
	})
	.addStringOption(option => {
		return option.setName('reason')
			.setDescription('Reason for the ban')
			.setRequired(true);
	});

module.exports = {
	name: command.name,
	handler: banHandler,
	deploy: command.toJSON()
};