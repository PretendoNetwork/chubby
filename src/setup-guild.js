const Discord = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { bot_token: botToken } = require('../config.json');
const warnCommand = require('./commands/warn');
const kickCommand = require('./commands/kick');
const banCommand = require('./commands/ban');

const rest = new REST({ version: '9' }).setToken(botToken);

const commandsDeploy = [
	warnCommand.deploy,
	kickCommand.deploy,
	banCommand.deploy
];

/**
 * 
 * @param {Discord.Guild} guild
 */
async function setupGuild(guild) {
	// do nothing if the bot does not have the correct permissions
	if (!guild.me.permissions.has([Discord.Permissions.FLAGS.MANAGE_ROLES, Discord.Permissions.FLAGS.MANAGE_CHANNELS])) {
		console.log('Bot does not have permissions to set up in guild', guild.name);
		return;
	}

	// Setup commands
	await deployCommands(guild);

	// If anyone has a better way of doing this I'm all ears
	// names should explain what they do
	await setupNSFWPunishedRoomChannel(guild);
	await setupNSFWPunishedLogChannel(guild);
	await setupMutedRole(guild);
	await setupNSFWPunishedRole(guild);
}

/**
 *
 * @param {Discord.Guild} guild
 */
async function deployCommands(guild) {
	await rest.put(Routes.applicationGuildCommands(guild.me.id, guild.id), { body: commandsDeploy });
}

/**
 *
 * @param {Discord.Guild} guild
 */
async function setupNSFWPunishedRoomChannel(guild) {
	if (!guild.channels.cache.find((channel) => channel.name === 'nsfw-punished-room')) {
		const channel = await guild.channels.create('nsfw-punished-room', {
			permissionOverwrites: [
				{
					id: guild.roles.everyone.id,
					deny: Discord.Permissions.ALL
				}
			]
		});

		const embed = new Discord.MessageEmbed();
		embed.setColor(0xe55c8b);
		embed.addFields([
			{
				name: 'What is this place? 🤔',
				value: 'This is where users suspected of posting NSFW content go'
			},
			{
				name: 'Why am I here! 😱',
				value: 'You have sent some image that we have picked up as NSFW'
			},
			{
				name: 'That can\'t be right... 🙄',
				value: 'The URL to the suspected NSFW image as well as your Discord tag at the time of sending are logged for admin review. If you believe this to be done in error, message an admin'
			}
		]);

		channel.send({ embeds: [embed] });
	}
}

/**
 *
 * @param {Discord.Guild} guild
 */
async function setupNSFWPunishedLogChannel(guild) {
	if (!guild.channels.cache.find((channel) => channel.name === 'nsfw-punished-logs')) {
		await guild.channels.create('nsfw-punished-logs', {
			permissionOverwrites: [
				{
					id: guild.roles.everyone.id,
					deny: Discord.Permissions.ALL
				}
			]
		});
	}
}

/**
 *
 * @param {Discord.Guild} guild
 */
async function setupMutedRole(guild) {
	let mutedRole = guild.roles.cache.find((role) => role.name === 'Muted');

	if (!mutedRole) {
		mutedRole = await guild.roles.create({
			name: 'Muted',
			mentionable: false,
			color: 0xFFFFFF,
			reason: 'Role for muting users with Chubby'
		});
	}

	guild.channels.cache.forEach(async channel => {
		await channel.permissionOverwrites?.create(mutedRole, {
			SEND_MESSAGES: false,
			MANAGE_MESSAGES: false,
			ADD_REACTIONS: false,
			SPEAK: false
		});
	});
}

/**
 *
 * @param {Discord.Guild} guild
 */
async function setupNSFWPunishedRole(guild) {
	let NSFWPunishedRole = guild.roles.cache.find((role) => role.name === 'NSFW Punished');

	if (!NSFWPunishedRole) {
		NSFWPunishedRole = await guild.roles.create({
			name: 'NSFW Punished',
			mentionable: false,
			color: 0xFFFFFF,
			reason: 'Role for punishing NSFW users with Chubby'
		});
	}

	guild.channels.cache.forEach(async channel => {
		const permissions = {
			SEND_MESSAGES: false,
			MANAGE_MESSAGES: false,
			ADD_REACTIONS: false,
			SPEAK: false,
			VIEW_CHANNEL: false,
			READ_MESSAGE_HISTORY: true
		};

		if (channel.name === 'nsfw-punished-room') {
			permissions.VIEW_CHANNEL = true;
		}

		await channel.permissionOverwrites?.create(NSFWPunishedRole, permissions);
	});
}

module.exports = setupGuild;