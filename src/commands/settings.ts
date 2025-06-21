import { SlashCommandBuilder } from '@discordjs/builders';
import { getDB } from '@/db';
import type { ChatInputCommandInteraction } from 'discord.js';

const editableOptions = [
	'nsfw.enabled',
	'nsfw.threshold.high',
	'nsfw.threshold.low',
	'nsfw.exemption.distance',
	'roles.muted',
	'roles.nsfw-punished',
	'roles.supporter',
	'roles.trusted',
	'roles.untrusted',
	'roles.mod-ping',
	'roles.mod-ping-allowed',
	'channels.nsfw-punished',
	'channels.nsfw-logs',
	'channels.event-logs',
	'channels.event-logs.blacklist',
	'channels.mod-logs',
	'channels.matchmaking',
	'channels.notifications',
	'matchmaking.lock-timeout-seconds',
	'leveling.channels-blacklist',
	'leveling.xp-required-for-trusted',
	'leveling.days-required-for-trusted',
	'leveling.supporter-xp-multiplier',
	'leveling.message-timeout-seconds'
];

function verifyInputtedKey(interaction: ChatInputCommandInteraction): string {
	const key = interaction.options.getString('key', true);
	if (!editableOptions.includes(key)) {
		throw new Error('Cannot edit this setting - not a valid setting');
	}
	return key;
}

async function settingsHandler(interaction: ChatInputCommandInteraction): Promise<void> {
	if (interaction.options.getSubcommand() === 'get') {
		const key = verifyInputtedKey(interaction);
		// this is hellish string concatenation, I know
		await interaction.reply({
			content:
				'```\n' + key + '=' + '\'' + `${getDB().get(key)}` + '\'' + '\n```',
			ephemeral: true,
			allowedMentions: {
				parse: [], // dont allow tagging anything
			},
		});
		return;
	}

	if (interaction.options.getSubcommand() === 'set') {
		const key = verifyInputtedKey(interaction);
		getDB().set(key, interaction.options.getString('value')!);
		await interaction.reply({
			content: `setting \`${key}\` has been saved successfully`,
			ephemeral: true,
			allowedMentions: {
				parse: [], // dont allow tagging anything
			},
		});
		return;
	}

	if (interaction.options.getSubcommand() === 'which') {
		await interaction.reply({
			content: `**possible settings**:\n${editableOptions
				.map((v) => `\`${v}\``)
				.join('\n')}`,
			ephemeral: true,
			allowedMentions: {
				parse: [], // dont allow tagging anything
			},
		});
		return;
	}

	throw new Error('unhandled subcommand');
}

const command = new SlashCommandBuilder();

command.setDefaultMemberPermissions('0');
command.setName('settings');
command.setDescription('Setup the bot');
command.addSubcommand((cmd) => {
	cmd.setName('set');
	cmd.setDescription('Change a settings key');
	cmd.addStringOption((option) => {
		option.setName('key');
		option.setDescription('Key to modify');
		option.setRequired(true);
		return option;
	});
	cmd.addStringOption((option) => {
		option.setName('value');
		option.setDescription('value to set the setting to');
		option.setRequired(true);
		return option;
	});
	return cmd;
});
command.addSubcommand((cmd) => {
	cmd.setName('get');
	cmd.setDescription('Get value of settings key');
	cmd.addStringOption((option) => {
		option.setName('key');
		option.setDescription('Key to modify');
		option.setRequired(true);
		return option;
	});
	return cmd;
});
command.addSubcommand((cmd) => {
	cmd.setName('which');
	cmd.setDescription('which settings are valid?');
	return cmd;
});

export default {
	name: command.name,
	help: 'Change settings of the bot',
	handler: settingsHandler,
	deploy: command.toJSON(),
};
