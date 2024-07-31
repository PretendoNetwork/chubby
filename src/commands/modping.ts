import { SlashCommandBuilder } from '@discordjs/builders';
import { getDB } from '@/db';
import type { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { ModPingSettings } from '@/models/modPingSettings';

async function interactionHandler(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.commandName !== 'mod-ping') {
        return;
    }

    const roleId = getDB().get('roles.mod-ping');
    if (!roleId) {
        await interaction.reply({ content: `Missing mod-ping role ID!`, ephemeral: true });
        return;
    }

    let message = 'An error occurred while processing your request.';

    try {
        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'toggle') {
            const member = interaction.member as GuildMember;
            const role = member.guild.roles.cache.get(roleId);

            if (role) {
                if (member.roles.cache.has(roleId)) {
                    await member.roles.remove(role);
                    message = `<@&${roleId}> has been removed from you.`;
                } else {
                    await member.roles.add(role);
                    message = `<@&${roleId}> has been assigned to you.`;
                }

                const settings = await ModPingSettings.findOne({ where: { user_id: member.id } });
                if (settings) {
                    message += '\nAuto-assign will override this if you change statuses.';
                }
            } else {
                message = 'Role not found.';
            }
        } else if (subcommandGroup === 'auto') {
            const userId = interaction.user.id;
            if (subcommand === 'assign') {
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
                    await interaction.reply({ content: `Sorry, this setup won't work. You need to have at least one status that isn't the same as the rest.`, ephemeral: true });
                    return;
                } else if (statusList.length === 1) {
                    message = `<@&${roleId}> will be assigned when you are ${statusList[0]}.`;
                } else {
                    const lastStatus = statusList.pop();
                    message = `<@&${roleId}> will be assigned when you are ${statusList.join(', ')} or ${lastStatus}.`;
                }

                const settings = {
                    online,
                    idle,
                    dnd,
                    offline
                };

                await ModPingSettings.upsert({
                    user_id: userId,
                    settings: JSON.stringify(settings)
                });

            } else if (subcommand === 'disable') {
                message = 'Auto-assign has been disabled.';

                await ModPingSettings.destroy({
                    where: { user_id: userId }
                });

            } else if (subcommand === 'current') {
                const settings = await ModPingSettings.findOne({
                    where: { user_id: userId }
                });

                if (settings) {
                    const { online, idle, dnd, offline } = JSON.parse(settings.settings);
                    message = `Current settings:\n- ${online ? '✅' : '❌'} Online\n- ${idle ? '✅' : '❌'} Idle\n- ${dnd ? '✅' : '❌'} Do Not Disturb\n- ${offline ? '✅' : '❌'} Offline`;
                } else {
                    message = 'You have auto-assign disabled.';
                }
            }
        }
    } catch (error) {
        console.error(`Error processing command: ${error}`);
        message = `The bot got this error: ${error}`;
    }

    await interaction.reply({ content: message, ephemeral: true });
}

const command = new SlashCommandBuilder();

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
