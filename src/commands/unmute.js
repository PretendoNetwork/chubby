const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const unmutes = require('../models/unmutes');
const db = require('../db');
const util = require('../util');

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
 async function unmuteHandler(interaction) {
	await interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild.fetch();
	const executingMember = await interaction.member.fetch();
	const executor = executingMember.user;
	const users = interaction.options.getString('users');
	const mutedRoleId = db.getDB().get('roles.muted');
    const mutedRole = mutedRoleId && await guild.roles.fetch(mutedRoleId);

	const userIds = [...new Set(Array.from(users.matchAll(Discord.MessageMentions.USERS_PATTERN), match => match[1]))];

	const unmuteListEmbed = new Discord.MessageEmbed();
	unmuteListEmbed.setTitle('User Unmute :speech_balloon:');
	unmuteListEmbed.setColor(0xFFA500);

	for (const userId of userIds) {
		const member = await interaction.guild.members.fetch(userId);
        const user = member.user;

        const eventLogEmbed = new Discord.MessageEmbed();

		eventLogEmbed.setColor(0xF24E43);
		eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
		eventLogEmbed.setTimestamp(Date.now());
		eventLogEmbed.setTitle('Event Type: _Member Unmuted_');
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
				name: 'From bot /unmute command',
				value: 'true'
			}
		);
		eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});

		await util.sendEventLogMessage(guild, null, eventLogEmbed);

		const sendMemberEmbeds = [];

		const unmuteEmbed = new Discord.MessageEmbed();

		unmuteEmbed.setTitle('Punishment Details');
		unmuteEmbed.setDescription('You have been manually unmuted in the Pretendo Network server. You may now speak inside the server.\nThank you for your patience');
		unmuteEmbed.setColor(0xF24E43);
		unmuteEmbed.setTimestamp(Date.now());
		unmuteEmbed.setAuthor({
			name: `Unmuted by: ${executingMember.user.tag}`,
			iconURL: executingMember.user.avatarURL()
		});
		unmuteEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});
        unmuteEmbed.setFields({
			name: 'Any concerns?',
			value: 'If you have any questions or concerns about your former mute, feel free to talk to a staff member'
		});

		sendMemberEmbeds.push(unmuteEmbed);

		await member.send({
			embeds: sendMemberEmbeds
		}).catch(() => console.log('Failed to DM user'));

        await(member.roles.remove(mutedRole));

		await unmutes.create({
			user_id: member.id,
			admin_user_id: executingMember.id,
		});

		unmuteListEmbed.addField(`${member.user.username} has been unmuted`, 'Feel free to dm them about their pardon', true);
	}

	await interaction.editReply({ embeds: [unmuteListEmbed], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultPermission(false)
	.setName('unmute')
	.setDescription('Unmute user(s)')
	.addStringOption(option => {
		return option.setName('users')
			.setDescription('User(s) to unmute')
			.setRequired(true);
	});

module.exports = {
	name: command.name,
	handler: unmuteHandler,
	deploy: command.toJSON()
};