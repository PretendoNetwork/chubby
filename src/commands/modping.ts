import { SlashCommandBuilder } from '@discordjs/builders';
import { ModPingSettings } from '@/models/modPingSettings';
import { getRoleFromSettings } from '@/util';
import type { ChatInputCommandInteraction, Role } from 'discord.js';

async function handleToggle(interaction: ChatInputCommandInteraction, role: Role): Promise<string> {
	const member = await interaction.guild!.members.fetch(interaction.user.id);
	let message;
	if (member.roles.cache.has(role.id)) {
		await member.roles.remove(role);
		message = `<@&${role.id}> has been removed from you.`;
	} else {
		await member.roles.add(role);
		message = `<@&${role.id}> has been assigned to you.`;
	}
	const settings = await ModPingSettings.findOne({ 
		where: { 
			user_id: member.id 
		} 
	});
	if (settings) {
		message += '\nAuto-assign will override this if you change statuses.';
	}
	return message;
}

async function handleAutoAssign(interaction: ChatInputCommandInteraction, role: Role): Promise<string> {
	const userID = interaction.user.id;
	const online = interaction.options.getBoolean('online') ?? true;
	const idle = interaction.options.getBoolean('idle') ?? true;
	const dnd = interaction.options.getBoolean('do_not_disturb') ?? false;
	const offline = interaction.options.getBoolean('offline') ?? false;
	const statusList = [];

	if (online) {
		statusList.push('Online');
	}
	if (idle) {
		statusList.push('Idle');
	}
	if (dnd) {
		statusList.push('Do Not Disturb');
	}
	if (offline) {
		statusList.push('Offline');
	}

	if (statusList.length === 0 || statusList.length === 4) {
		return 'Sorry, this setup won\'t work. You need to have at least one status that isn\'t the same as the rest.';
	} else if (statusList.length === 1) {
		return `<@&${role.id}> will be assigned when you are ${statusList[0]}.`;
	} else {
		const lastStatus = statusList.pop();
		const message = `<@&${role.id}> will be assigned when you are ${statusList.join(', ')} or ${lastStatus}.`;
		await ModPingSettings.upsert({
			user_id: userID,
			online,
			idle,
			dnd,
			offline
		});
		return message;
	}
}

async function handleAutoDisable(interaction: ChatInputCommandInteraction): Promise<string> {
	const userID = interaction.user.id;
	await ModPingSettings.destroy({ 
		where: { 
			user_id: userID
		} 
	});
	return 'Auto-assign has been disabled.';
}

async function handleAutoCurrent(interaction: ChatInputCommandInteraction): Promise<string> {
	const userID = interaction.user.id;
	const settings = await ModPingSettings.findOne({ 
		where: { 
			user_id: userID
		} 
	});
	if (settings) {
		const { online, idle, dnd, offline } = settings;
		return `Current settings:
		${online ? '✅' : '❌'} Online
		${idle ? '✅' : '❌'} Idle
		${dnd ? '✅' : '❌'} Do Not Disturb
		${offline ? '✅' : '❌'} Offline`;
	} else {
		return 'You have auto-assign disabled.';
	}
}

async function interactionHandler(interaction: ChatInputCommandInteraction): Promise<void> {
	const role = await getRoleFromSettings(interaction.guild!, 'roles.mod-ping');
	if (!role) {
		await interaction.reply({ content: 'Missing mod-ping role ID!', ephemeral: true });
		return;
	}

	let message = 'An error occurred while processing your request.';
	const subcommandGroup = interaction.options.getSubcommandGroup(false);
	const subcommand = interaction.options.getSubcommand();

	if (subcommand === 'toggle') {
		message = await handleToggle(interaction, role);
	} else if (subcommandGroup === 'auto') {
		if (subcommand === 'assign') {
			message = await handleAutoAssign(interaction, role);
		} else if (subcommand === 'disable') {
			message = await handleAutoDisable(interaction);
		} else if (subcommand === 'current') {
			message = await handleAutoCurrent(interaction);
		}
	}

	await interaction.reply({ content: message, ephemeral: true });
}

const command = new SlashCommandBuilder();
command.setDefaultMemberPermissions('0');
command.setName('mod-ping');
command.setDescription('Manage your @Mod-Ping role.');
command.addSubcommand((cmd) => 
	cmd.setName('toggle')
		.setDescription('Manually toggle @Mod-Ping. (Overrides auto-assign, but still auto-assigns when your status changes)')
);
command.addSubcommandGroup((group) => 
	group.setName('auto')
		.setDescription('Automatically assign @Mod-Ping based on your status.')
		.addSubcommand((cmd) =>
			cmd.setName('assign')
				.setDescription('Enable auto-assign. (Default: Online/Idle assigns, Offline/DND removes)')
				.addBooleanOption((option) =>
					option.setName('online')
						.setDescription('Assign @Mod-Ping while Online. Default: ✅')
				)
				.addBooleanOption((option) =>
					option.setName('idle')
						.setDescription('Assign @Mod-Ping while Idle. Default: ✅')
				)
				.addBooleanOption((option) =>
					option.setName('do_not_disturb')
						.setDescription('Assign @Mod-Ping while in Do Not Disturb. Default: ❌')
				)
				.addBooleanOption((option) =>
					option.setName('offline')
						.setDescription('Assign @Mod-Ping while Offline. Default: ❌')
				)
		)
		.addSubcommand((cmd) =>
			cmd.setName('disable')
				.setDescription('Disable auto-assign.')
		)
		.addSubcommand((cmd) =>
			cmd.setName('current')
				.setDescription('View your current auto-assign settings.')
		)
);

export default {
	name: command.name,
	help: 'Manage your @Mod-Ping role',
	handler: interactionHandler,
	deploy: command.toJSON(),
};
