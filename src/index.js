const Discord = require('discord.js');
const setupGuild = require('./setup-guild');
const messageHandler = require('./message-handler');
const config = require('../config.json');

const bot = new Discord.Client();

bot.on('ready', () => {
	bot.guilds.cache.forEach(setupGuild);

	console.log(`Logged in as ${bot.user.tag}!`);
});

bot.on('message', messageHandler);

bot.login(config.bot_token);