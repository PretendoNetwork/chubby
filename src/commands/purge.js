const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const util = require('../util');

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function purgeHandler(interaction) {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild.fetch();
	const executingMember = await interaction.member.fetch();
	const executor = executingMember.user;
	const deleteAmount = interaction.options.getInteger('amount');
	const users = interaction.options.getString('users');

	const eventLogEmbed = new Discord.MessageEmbed();

	const purgeReplyEmbed = new Discord.MessageEmbed();
	const image = new Discord.MessageAttachment('./src/images/mod/mod-purge.png');

	if (users !== null) { // if a user(s) is actually given
		purgeReplyEmbed.setTitle('Messages Purged');
		purgeReplyEmbed.setColor(0xff6363);
		purgeReplyEmbed.setThumbnail('attachment://mod-purge.png');

		const userIds = [...new Set(Array.from(users.matchAll(Discord.MessageMentions.USERS_PATTERN), match => match[1]))];

		for (const userId of userIds) {
			const member = await interaction.guild.members.fetch(userId);
			const user = member.user;

			// Grab the user's messages
			const userMessages = (await interaction.channel.messages.fetch()).filter(
				(m) => m.author.id === member.id
			);
			await interaction.channel.bulkDelete(userMessages);
		
			eventLogEmbed.setColor(0xff6363);
			eventLogEmbed.setTitle('_Messages Purged_');
			eventLogEmbed.setDescription(`${user.username}'s messages deleted in ${interaction.channel.name}`);
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
					name: 'Channel',
					value: `<#${interaction.channelId}>`
				}
			);
			eventLogEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});
			eventLogEmbed.setTimestamp(Date.now());
			eventLogEmbed.setThumbnail('attachment://mod-purge.png');
		
			await util.sendEventLogMessage('channels.mod-logs', guild, interaction.channelId, eventLogEmbed, image, null);

			purgeReplyEmbed.setDescription(`${user.username} has been successfully purged, here is where the messages been purged in`);
			purgeReplyEmbed.addField('User Messages were purged in', `<#${interaction.channelId}>`, true);
			purgeReplyEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});
			purgeReplyEmbed.setTimestamp(Date.now());
			await interaction.editReply({ embeds: [purgeReplyEmbed], files: [image], ephemeral: true });
		}
	} else {
		if (isNaN(deleteAmount) || deleteAmount < 2 || parseInt(deleteAmount) > 99) { // Either nothing is given within the delete amount OR less than 2
			throw new Error('Please insert an amount between 2-99 to delete.');
		}
		
		purgeReplyEmbed.setTitle('Messages Purged');
		purgeReplyEmbed.setColor(0xff6363);
		purgeReplyEmbed.setThumbnail('attachment://mod-purge.png');

		// Bulk Delete
		let { size } = await interaction.channel.bulkDelete(deleteAmount);
			
		eventLogEmbed.setColor(0xff6363);
		eventLogEmbed.setTitle('_Messages Purged_');
		eventLogEmbed.setDescription(`${size} messages deleted in <#${interaction.channelId}>`);
		eventLogEmbed.setTimestamp(Date.now());
		eventLogEmbed.setFields(
			{
				name: 'Moderator',
				value: `<@${executor.id}>`
			},
			{
				name: 'Moderator User ID',
				value: executor.id
			},
			{
				name: 'Channel',
					value: `<#${interaction.channelId}>`
			},
			{
				name: 'Amount of Messages Deleted',
				value: `${size}`
			}
		);
			eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});
		eventLogEmbed.setTimestamp(Date.now());
		eventLogEmbed.setThumbnail('attachment://mod-purge.png');
			
		await util.sendEventLogMessage('channels.mod-logs', guild, interaction.channelId, eventLogEmbed, image, null);
	
		purgeReplyEmbed.setDescription(`<#${interaction.channelId}> has been successfully purged, here is how many messages been purged`);
		purgeReplyEmbed.addField('Amount of messages purged', `${size}`, true);
		purgeReplyEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});
		purgeReplyEmbed.setTimestamp(Date.now());
		await interaction.editReply({ embeds: [purgeReplyEmbed], files: [image], ephemeral: true });
	}
}

const command = new SlashCommandBuilder()
	.setDefaultPermission(false)
	.setName('purge')
	.setDescription('purge message(s)')
	.addIntegerOption(option => {
		return option.setName('amount')
			.setDescription('Amount of messages deleted (2-99)')
			.setRequired(false);
	})
	.addStringOption(option => {
		return option.setName('users')
			.setDescription('User(s) to purged (will only purge within the current channel)')
			.setRequired(false);
	});

module.exports = {
 name: command.name,
 handler: purgeHandler,
 deploy: command.toJSON()
};