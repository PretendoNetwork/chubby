import { escapeMarkdown, SlashCommandBuilder } from '@discordjs/builders';
import { ZodError } from 'zod';
import { getAllSettings, getSetting, setSetting, settingsDefinitions } from '@/models/settings';
import type { SettingsKeys } from '@/models/settings';
import type { ChatInputCommandInteraction } from 'discord.js';

function verifyInputtedKey(key: string | null): key is SettingsKeys {
	if (!key) {
		return false;
	}
	return Object.keys(settingsDefinitions).includes(key);
}

function formatOutput(key: string, value: any): string {
	if (key.includes('channel')) {
		if (Array.isArray(value)) {
			return value.map(v => `<#${v}>`).join(', ') || '<empty>';
		}
		if (typeof value === 'string' && value.length > 0) {
			return `<#${value}>`;
		}
		return '<empty>';
	}

	if (key.includes('role')) {
		if (Array.isArray(value)) {
			return value.map(v => `<@&${v}>`).join(', ') || '<empty>';
		}
		if (typeof value === 'string' && value.length > 0) {
			return `<@&${value}>`;
		}
		return '<empty>';
	}

	const stringValue = escapeMarkdown(JSON.stringify(value));
	if (stringValue.length === 0) {
		return '<empty>';
	}
	return stringValue;
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
			content: `\`${key}\` = ${formatOutput(key, await getSetting(key)) ?? '`null`'}`,
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

		const value = interaction.options.getString('value');
		if (value === null || value.length === 0) {
			await interaction.reply({
				content: 'Value cannot be empty',
				ephemeral: true
			});
			return;
		}

		let parsedValue;
		try {
			// Parse JSON to handle arrays and
			parsedValue = JSON.parse(value);
		} catch {
			parsedValue = value; // If JSON parsing fails, we'll assume it's a simple string
		}

		const setResult = await setSetting(key, parsedValue);

		if (!setResult.success) {
			let message = 'Unknown error';
			if (setResult.error instanceof ZodError) {
				message = `\n${setResult.error.issues.map(issue => `- ${issue.message}`).join('\n')}`;
			} else if (setResult.error instanceof Error) {
				message = setResult.error.message;
			}

			await interaction.reply({
				content: `Failed to set \`${key}\`: ${message}`,
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
		const sortedKeys = Object.keys(allSettings).sort((a, b) => a.localeCompare(b));
		const settingsOutput = sortedKeys.map(key => `\`${key}\` = ${formatOutput(key, allSettings[key])}`).join('\n');
		await interaction.reply({
			content: `**Possible settings**:\n${settingsOutput}`,
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
