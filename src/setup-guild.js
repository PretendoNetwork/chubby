const Discord = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { bot_token: botToken } = require('../config.json');
const rest = new REST({ version: '10' }).setToken(botToken);

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

	// Populate members cache
	await guild.members.fetch();

	// Setup commands
	await deployCommands(guild);

	// If anyone has a better way of doing this I'm all ears
	// names should explain what they do
	await setupRoles(guild);
	await setupCategories(guild);
	await setupTextChannels(guild);
}

/**
 *
 * @param {Discord.Guild} guild
 */
async function deployCommands(guild) {
	const deploy = [];

	guild.client.commands.forEach((command) => {
		deploy.push(command.deploy);
	});

	await rest.put(Routes.applicationGuildCommands(guild.me.id, guild.id), {
		body: deploy,
	});
}

/**
 * 
 * @param {Discord.Guild} guild
 */
async function setupRoles(guild) {
	await setupMutedRole(guild);
	await setupNSFWPunishedRole(guild);
}

/**
 * 
 * @param {Discord.Guild} guild
 */
async function setupCategories(guild) {
	await setupModeratorCategory(guild);
}

/**
 * 
 * @param {Discord.Guild} guild
 */
async function setupTextChannels(guild) {
	await setupNSFWPunishedRoomChannel(guild);
	await setupNSFWPunishedLogChannel(guild);
	await setupEventLogChannel(guild);
}

/***************
 *             *
 *    ROLES    *
 *             *
 ***************/

/**
 *
 * @param {Discord.Guild} guild
 */
async function setupMutedRole(guild) {
	const roles = await guild.roles.fetch();
	let role = roles.find(role => role.name === 'Muted');

	if (!role) {
		role = await guild.roles.create({
			name: 'Muted',
			mentionable: false,
			color: 0xFFFFFF,
			reason: 'Role for muting users with Chubby'
		});
	}

	const channels = await guild.channels.fetch();

	for (const id of channels.keys()) {
		const channel = await channels.get(id).fetch();

		await channel.permissionOverwrites?.create(role, {
			SEND_MESSAGES: false,
			MANAGE_MESSAGES: false,
			ADD_REACTIONS: false,
			SPEAK: false
		});
	}
}

/**
 *
 * @param {Discord.Guild} guild
 */
async function setupNSFWPunishedRole(guild) {
	const roles = await guild.roles.fetch();
	let role = roles.find((role) => role.name === 'NSFW Punished');

	if (!role) {
		role = await guild.roles.create({
			name: 'NSFW Punished',
			mentionable: false,
			color: 0xFFFFFF,
			reason: 'Role for punishing NSFW users with Chubby'
		});
	}

	const channels = await guild.channels.fetch();

	for (const id of channels.keys()) {
		const channel = await channels.get(id).fetch();

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

		await channel.permissionOverwrites?.create(role, permissions);
	}
}

/***************************
 *                         *
 *    CATEGORY CHANNELS    *
 *                         *
 ***************************/

/**
 *
 * @param {Discord.Guild} guild
 */
async function setupModeratorCategory(guild) {
	const channels = await guild.channels.fetch();
	let category = channels.find(channel => channel.type === 'GUILD_CATEGORY' && channel.name === 'moderator');

	if (!category) {
		category = await guild.channels.create('moderator', {
			type: 'GUILD_CATEGORY'
		});
	}

	const roles = await guild.roles.fetch();
	const permissionOverwrites = [{
		id: guild.roles.everyone,
		deny: Discord.Permissions.ALL
	}];

	roles.forEach(role => {
		if (role.permissions.has(Discord.Permissions.FLAGS.MODERATE_MEMBERS)) {
			permissionOverwrites.push({
				type: 'role',
				id: role.id,
				allow: Discord.Permissions.ALL
			});
		}
	});

	await category.permissionOverwrites.set(permissionOverwrites);
}

/***********************
 *                     *
 *    TEXT CHANNELS    *
 *                     *
 ***********************/

/**
 *
 * @param {Discord.Guild} guild
 */
async function setupNSFWPunishedRoomChannel(guild) {
	const channels = await guild.channels.fetch();
	const category = channels.find(channel => channel.type === 'GUILD_CATEGORY' && channel.name === 'moderator');
	let channel = channels.find(channel => channel.type === 'GUILD_TEXT' && channel.name === 'nsfw-punished-room');

	if (!channel) {
		channel = await guild.channels.create('nsfw-punished-room', {
			type: 'GUILD_TEXT',
			permissionOverwrites: [
				{
					id: guild.roles.everyone.id,
					deny: Discord.Permissions.ALL
				}
			]
		});
	}

	if (channel.parentId !== category.id) {
		await channel.setParent(category);
	}

	const messages = await channel.messages.fetch();
	let botMessages = messages.filter(message => message.author.id === guild.me.id);
	botMessages = botMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

	const embed = new Discord.MessageEmbed();
	embed.setColor(0xE55C8B);
	embed.setFields([
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

	const messageContent = { embeds: [embed] };

	const message = botMessages.at(0);

	if (!message) {
		await channel.send(messageContent);
	} else {
		// TODO: Check if old message equals current message data?
		await message.edit(messageContent);
	}
}

/**
 *
 * @param {Discord.Guild} guild
 */
async function setupNSFWPunishedLogChannel(guild) {
	const channels = await guild.channels.fetch();
	const category = channels.find(channel => channel.type === 'GUILD_CATEGORY' && channel.name === 'moderator');
	let channel = channels.find(channel => channel.type === 'GUILD_TEXT' && channel.name === 'nsfw-punished-logs');

	if (!channel) {
		channel = await guild.channels.create('nsfw-punished-logs', {
			type: 'GUILD_TEXT',
			nsfw: true,
			permissionOverwrites: [
				{
					id: guild.roles.everyone.id,
					deny: Discord.Permissions.ALL
				}
			]
		});
	}

	if (channel.parentId !== category.id) {
		await channel.setParent(category);
	}
}

/**
 *
 * @param {Discord.Guild} guild
 */
async function setupEventLogChannel(guild) {
	const channels = await guild.channels.fetch();
	const category = channels.find(channel => channel.type === 'GUILD_CATEGORY' && channel.name === 'moderator');
	let channel = channels.find(channel => channel.type === 'GUILD_TEXT' && channel.name === 'event-log');

	if (!channel) {
		channel = await guild.channels.create('event-log', {
			type: 'GUILD_TEXT'
		});
	}

	if (channel.parentId !== category.id) {
		await channel.setParent(category);
	}

	const roles = await guild.roles.fetch();
	const permissionOverwrites = [{
		id: guild.roles.everyone,
		deny: Discord.Permissions.ALL
	}];

	roles.forEach(role => {
		if (role.permissions.has(Discord.Permissions.FLAGS.MODERATE_MEMBERS)) {
			permissionOverwrites.push({
				type: 'role',
				id: role.id,
				allow: Discord.Permissions.ALL
			});
		}
	});

	await channel.permissionOverwrites.set(permissionOverwrites);
}

module.exports = setupGuild;