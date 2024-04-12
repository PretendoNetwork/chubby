const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Warnings = require('../models/warnings');
const Kicks = require('../models/kicks');
const Bans = require('../models/bans');
const util = require('../util');
const warn = require('./warn');

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function pardonHandler(interaction) {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild.fetch();
	const executingMember = await interaction.member.fetch();
	const executor = executingMember.user;
	const type = interaction.options.getString('type');
	const users = interaction.options.getString('users');
	const reason = interaction.options.getString('reason');

	const userIds = [...new Set(Array.from(users.matchAll(Discord.MessageMentions.USERS_PATTERN), match => match[1]))];

	const pardonImage = new Discord.MessageAttachment('./src/images/mod/mod-pardon.png');
	// Initialize all of the embeds
	const pardonedListEmbed = new Discord.MessageEmbed();
	const eventLogEmbed = new Discord.MessageEmbed();
	const pardonDmEmbed = new Discord.MessageEmbed();

	for (const userId of userIds) { 
		const member = await interaction.guild.members.fetch(userId);
		const user = member.user;

		if (type === 'warn_type') { // If chosen warn within options
			const { count } = await Warnings.findAndCountAll({ // Grab all warns
				where: {
					user_id: member.id
				}
			});

			// Ease of reading instead of searching for "count"
			let userWarns = count;
			
			if (userWarns < 1 || isNaN(userWarns)) { // User has no warns
				throw new Error('This user has no warnings. Ensure you are using the correct user');
			} else { // User has warns
				pardonedListEmbed.setTitle('User Pardoned');
				pardonedListEmbed.setColor(0xffffff);
				pardonedListEmbed.setDescription(`${user.username} has been successfully pardoned, here is their warns now`);
				pardonedListEmbed.setThumbnail('attachment://mod-pardon.png');

				eventLogEmbed.setAuthor({
					name: user.tag,
					iconURL: user.avatarURL()
				});
				eventLogEmbed.setColor(0xffffff);
				eventLogEmbed.setDescription(`${user.username} has been pardoned in Pretendo by ${executor.username}`);
				eventLogEmbed.setThumbnail('attachment://mod-pardon.png');
				eventLogEmbed.setTimestamp(Date.now());
				eventLogEmbed.setTitle('_Member Pardoned_');
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
						name: 'Type',
						value: 'Warn Pardon'
					},
					{
						name: 'Reason',
						value: reason
					}
				);
				eventLogEmbed.setFooter({
					text: 'Pretendo Network',
					iconURL: guild.iconURL()
				});

				await util.sendEventLogMessage('channels.mod-logs', guild, null, eventLogEmbed, pardonImage, null);

				const targetedWarn = await Warnings.findOne({
					where: {
						user_id: member.id
					}
				});

				await targetedWarn.destroy(); // Delete a warn

				userWarns--; // Cheap way to keep count

				// Dm the user
				pardonDmEmbed.setTitle('_Member Pardoned_');
				pardonDmEmbed.setDescription('You have been granted a pardon.\nYou may review the details of your pardon below');
				pardonDmEmbed.setThumbnail('attachment://mod-pardon.png');
				pardonDmEmbed.setColor(0xffffff);
				pardonDmEmbed.setTimestamp(Date.now());
				pardonDmEmbed.setFooter({
					text: 'Pretendo Network',
					iconURL: guild.iconURL()
				});
				pardonDmEmbed.setFields(
					{
						name: 'Reason',
						value: reason
					},
					{
						name: 'Total Warnings',
						value: userWarns.toString()
					},
					{
						name: 'Warnings Left Until Kick',
						value: Math.max(0, 3 - userWarns).toString()
					},
					{
						name: 'Warnings Left Until Ban',
						value: Math.max(0, 4 - userWarns).toString()
					}
				);

				await member.send({
					embeds: [pardonDmEmbed],
					files: [pardonImage]
				}).catch(() => console.log('Failed to DM user'));

				pardonedListEmbed.addField(`${member.user.username}'s warns`, userWarns.toString(), true);
				pardonedListEmbed.setFooter({
					text: 'Pretendo Network',
					iconURL: guild.iconURL()
				});
				pardonedListEmbed.setTimestamp(Date.now());
			}
		} else if (type === 'kick_type') {
			const { count } = await Kicks.findAndCountAll({ // Grab all kicks
				where: {
					user_id: member.id
				}
			});

			// Ease of reading instead of searching for "count"
			let userKicks = count;

			if (userKicks < 1 || isNaN(userKicks)) { // User has no kicks
				throw new Error('This user has no kicks. Ensure you are using the correct user.');
			} else { // User has kicks
				pardonedListEmbed.setTitle('User Pardoned');
				pardonedListEmbed.setColor(0xffffff);
				pardonedListEmbed.setDescription(`${user.username} has been successfully pardoned, here is their kicks now`);
				pardonedListEmbed.setThumbnail('attachment://mod-pardon.png');

				eventLogEmbed.setAuthor({
					name: user.tag,
					iconURL: user.avatarURL()
				});
				eventLogEmbed.setColor(0xffffff);
				eventLogEmbed.setDescription(`${user.username} has been pardoned in Pretendo by ${executor.username}`);
				eventLogEmbed.setThumbnail('attachment://mod-pardon.png');
				eventLogEmbed.setTimestamp(Date.now());
				eventLogEmbed.setTitle('_Member Pardoned_');
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
						name: 'Type',
						value: 'Kick Pardon'
					},
					{
						name: 'Reason',
						value: reason
					}
				);
				eventLogEmbed.setFooter({
					text: 'Pretendo Network',
					iconURL: guild.iconURL()
				});

				await util.sendEventLogMessage('channels.mod-logs', guild, null, eventLogEmbed, pardonImage, null);

				const targetedKick = await Kicks.findOne({
					where: {
						user_id: member.id
					}
				});

				await targetedKick.destroy(); // Delete one kick

				userKicks--; // Cheap way to keep count in the embed

				// Dm the user
				pardonDmEmbed.setTitle('_Member Pardoned_');
				pardonDmEmbed.setDescription('You have been granted a pardon.\nYou may review the details of your pardon below');
				pardonDmEmbed.setThumbnail('attachment://mod-pardon.png');
				pardonDmEmbed.setColor(0xffffff);
				pardonDmEmbed.setTimestamp(Date.now());
				pardonDmEmbed.setFooter({
					text: 'Pretendo Network',
					iconURL: guild.iconURL()
				});
				pardonDmEmbed.setFields(
					{
						name: 'Pardon Reason',
						value: reason
					},
					{
						name: 'Amount Of Times Kicked Now',
						value: userKicks.toString()
					}
				);

				await member.send({
					embeds: [pardonDmEmbed],
					files: [pardonImage]
				}).catch(() => console.log('Failed to DM user'));

				pardonedListEmbed.addField(`${member.user.username}'s kicks`, userKicks.toString(), true);
				pardonedListEmbed.setFooter({
					text: 'Pretendo Network',
					iconURL: guild.iconURL()
				});
				pardonedListEmbed.setTimestamp(Date.now());
			}
		}
	}
	await interaction.editReply({ embeds: [pardonedListEmbed], files: [pardonImage], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultPermission(false)
	.setName('pardon')
	.setDescription('Pardon user(s)')
	.addStringOption(option => {
		return option.setName('type')
			.setDescription('Type to pardon')
			.setRequired(true)
			.addChoices(
				{ name: 'Warn', value: 'warn_type'},
				{ name: 'Kick', value: 'kick_type' }
			);
	})
	.addStringOption(option => {
		return option.setName('users')
			.setDescription('User(s) to pardon')
			.setRequired(true);
	})
	.addStringOption(option => {
		return option.setName('reason')
			.setDescription('Reason for the pardon')
			.setRequired(true);
	});

module.exports = {
	name: command.name,
	handler: pardonHandler,
	deploy: command.toJSON()
};