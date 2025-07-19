import { escapeMarkdown, SlashCommandBuilder } from '@discordjs/builders';
import { getAllSettings, getSetting, setSetting, settingsDefinitions } from '@/models/settings';
import type { SettingsKeys } from '@/models/settings';
import type { ChatInputCommandInteraction } from 'discord.js';

function verifyInputtedKey(key: string | null): key is SettingsKeys {
	if (!key) {
		return false;
	}
	return Object.keys(settingsDefinitions).includes(key);
}

async function settingsHandler(interaction: ChatInputCommandInteraction): Promise<void> {
	if (interaction.options.getSubcommand() === 'get') {
		const key = interaction.options.getString('key');
		const validKey = verifyInputtedKey(key);

		if (!validKey) {
			await interaction.reply({
				content: 'Invalid key provided. Use `/settings list` to see valid keys.',
				ephemeral: true
			});
			return;
		}

		await interaction.reply({
			content: `\`${key}\` = \`${escapeMarkdown(String(await getSetting(key))) ?? 'null'}\``,
			ephemeral: true,
			allowedMentions: {
				parse: [] // Don't allow tagging anything
			}
		});
		return;
	}

	if (interaction.options.getSubcommand() === 'set') {
		const key = interaction.options.getString('key');
		const validKey = verifyInputtedKey(key);

		if (!validKey) {
			await interaction.reply({
				content: 'Invalid key provided. Use `/settings list` to see valid keys.',
				ephemeral: true
			});
			return;
		}

		const setResult = await setSetting(key, interaction.options.getString('value'));

		if (!setResult.success) {
			await interaction.reply({
				content: `Failed to set \`${key}\`: ${setResult.error?.message ?? 'Unknown error'}`,
				ephemeral: true
			});
			return;
		}

		await interaction.reply({
			content: `Setting \`${key}\` has been saved successfully`,
			ephemeral: true
		});
		return;
	}

	if (interaction.options.getSubcommand() === 'list') {
		const allSettings = await getAllSettings();
		await interaction.reply({
			content: `**Possible settings**:\n${Object.keys(allSettings)
				.map(v => `\`${v}\`: \`${escapeMarkdown(String(allSettings[v]))}\``)
				.join('\n')}`,
			ephemeral: true
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
		option.setChoices(...Object.keys(settingsDefinitions).map((key) => {
			return { name: key, value: key };
		}));
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
		option.setChoices(...Object.keys(settingsDefinitions).map((key) => {
			return { name: key, value: key };
		}));
		return option;
	});
	return cmd;
});
command.addSubcommand((cmd) => {
	cmd.setName('list');
	cmd.setDescription('List all settings');
	return cmd;
});

export default {
	name: command.name,
	help: 'Change settings of the bot',
	handler: settingsHandler,
	deploy: command.toJSON()
};
