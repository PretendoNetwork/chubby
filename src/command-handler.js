const warnCommand = require('./commands/warn');

const commands = {
	'/warn': warnCommand
};

function commandHandler(message) {
	// get the command parts
	const tokens = message.content.split(' ');
	const command = tokens.shift();

	// Only checking moderation permissions
	// Admins will have these permissions anyway so no need to check for ADMINISTRATOR
	if (!message.member.hasPermission(['KICK_MEMBERS', 'BAN_MEMBERS'])) {
		// Do nothing if the user can't moderate users
		return;
	}

	// do nothing if no command
	if (!commands[command]) {
		message.reply(`Unknown command \`${command}\``);
		return;
	}

	// run the command
	commands[command](message, tokens);
}

module.exports = commandHandler;