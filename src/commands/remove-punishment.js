const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Warnings = require('../models/warnings');
const Kicks = require('../models/kicks');
const util = require('../util');

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function removePunishmentHandler(interaction) {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild.fetch();
	const executingMember = await interaction.member.fetch();
	const executor = executingMember.user;
	const type = interaction.options.getString('type');
	const reason = interaction.options.getString('reason');
	const removalId = interaction.options.getInteger('id');

	const punishmentRemovedImage = new Discord.MessageAttachment('./src/images/mod/mod-punishmentremoved.png');
	// Initialize all of the embeds
	const removedListEmbed = new Discord.MessageEmbed();
	const eventLogEmbed = new Discord.MessageEmbed();
	const removedPunishmentDmEmbed = new Discord.MessageEmbed();

	if (type === 'warn_type') { // If chosen warn within options
		const removalRow = await Warnings.findOne({ // Grab all warns
			where: {
				id: removalId
			}
		});

		if (!removalRow) { // User has no warns
			throw new Error('There is no warn with that ID. Ensure you are using the correct ID');
		} else { // User has warns
			const member = await interaction.guild.members.fetch(removalRow.user_id);

			removedListEmbed.setTitle('User\'s Punishment Removed');
			removedListEmbed.setColor(0xffffff);
			removedListEmbed.setDescription(`${member.user.username} punishment has been successfully removed`);
			removedListEmbed.setThumbnail('attachment://mod-punishmentremoved.png');

			eventLogEmbed.setAuthor({
				name: member.user.tag,
				iconURL: member.user.avatarURL()
			});
			eventLogEmbed.setColor(0xffffff);
			eventLogEmbed.setDescription(`${member.username} punishment has been removed in Pretendo by ${executor.username}`);
			eventLogEmbed.setThumbnail('attachment://mod-punishmentremoved.png');
			eventLogEmbed.setTimestamp(Date.now());
			eventLogEmbed.setTitle('_User\'s Punishment Removed_');
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
					name: 'Moderator',
					value: `<@${executor.id}>`
				},
				{
					name: 'Moderator User ID',
					value: executor.id
				},
				{
					name: 'Type',
					value: 'Warn Removed'
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

			await util.sendEventLogMessage('channels.mod-logs', guild, null, eventLogEmbed, punishmentRemovedImage, null);

			await removalRow.destroy(); // Delete a warn

			// Dm the user
			removedPunishmentDmEmbed.setTitle('_Member\'s Punishment Removed_');
			removedPunishmentDmEmbed.setDescription('Your warn has been removed.\nYou may review the details of your punishment removal below');
			removedPunishmentDmEmbed.setThumbnail('attachment://mod-punishmentremoved.png');
			removedPunishmentDmEmbed.setColor(0xffffff);
			removedPunishmentDmEmbed.setTimestamp(Date.now());
			removedPunishmentDmEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});
			removedPunishmentDmEmbed.setFields(
				{
					name: 'Removal Reason',
					value: reason
				},
				{
					name: 'Original Reason',
					value: removalRow.reason
				}
			);

			await member.send({
				embeds: [removedPunishmentDmEmbed],
				files: [punishmentRemovedImage]
			}).catch(() => console.log('Failed to DM user'));
			removedListEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});
			removedListEmbed.setTimestamp(Date.now());
		}
	} else if (type == 'kick_type') {
		const removalRow = await Kicks.findOne({ // Grab all warns
			where: {
				id: removalId
			}
		});

		if (!removalRow) { // User has no warns
			throw new Error('There is no warn with that ID. Ensure you are using the correct ID');
		} else {
			const member = await interaction.guild.members.fetch(removalRow.user_id);

			removedListEmbed.setTitle('User\'s Punishment Removed');
			removedListEmbed.setColor(0xffffff);
			removedListEmbed.setDescription(`${member.user.username} punishment has been successfully removed`);
			removedListEmbed.setThumbnail('attachment://mod-punishmentremoved.png');

			eventLogEmbed.setAuthor({
				name: member.user.tag,
				iconURL: member.user.avatarURL()
			});
			eventLogEmbed.setColor(0xffffff);
			eventLogEmbed.setDescription(`${member.username} punishment has been removed in Pretendo by ${executor.username}`);
			eventLogEmbed.setThumbnail('attachment://mod-punishmentremoved.png');
			eventLogEmbed.setTimestamp(Date.now());
			eventLogEmbed.setTitle('_User\'s Punishment Removed_');
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
					name: 'Moderator',
					value: `<@${executor.id}>`
				},
				{
					name: 'Moderator User ID',
					value: executor.id
				},
				{
					name: 'Type',
					value: 'Kick Removed'
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

			await util.sendEventLogMessage('channels.mod-logs', guild, null, eventLogEmbed, punishmentRemovedImage, null);

			await removalRow.destroy(); // Delete a warn

			// Dm the user
			removedPunishmentDmEmbed.setTitle('_Member\'s Punishment Removed_');
			removedPunishmentDmEmbed.setDescription('Your kick has been removed.\nYou may review the details of your punishment removal below');
			removedPunishmentDmEmbed.setThumbnail('attachment://mod-punishmentremoved.png');
			removedPunishmentDmEmbed.setColor(0xffffff);
			removedPunishmentDmEmbed.setTimestamp(Date.now());
			removedPunishmentDmEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});
			removedPunishmentDmEmbed.setFields(
				{
					name: 'Removal Reason',
					value: reason
				},
				{
					name: 'Original Reason',
					value: removalRow.reason
				}
			);

			await member.send({
				embeds: [removedPunishmentDmEmbed],
				files: [punishmentRemovedImage]
			}).catch(() => console.log('Failed to DM user'));
			removedListEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});
			removedListEmbed.setTimestamp(Date.now());
		}
	}
	await interaction.editReply({ embeds: [removedListEmbed], files: [punishmentRemovedImage], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultPermission(false)
	.setName('remove-punishment')
	.setDescription('Remove punishment from user(s)')
	.addStringOption(option => {
		return option.setName('type')
			.setDescription('Type to remove')
			.setRequired(true)
			.addChoices(
				{ name: 'Warn', value: 'warn_type'},
				{ name: 'Kick', value: 'kick_type' }
			);
	})
	.addIntegerOption(option => {
		return option.setName('id')
			.setDescription('ID of warn/kick')
			.setRequired(true);
	})
	.addStringOption(option => {
		return option.setName('reason')
			.setDescription('Reason for the removal')
			.setRequired(true);
	});

module.exports = {
	name: command.name,
	handler: removePunishmentHandler,
	deploy: command.toJSON()
};