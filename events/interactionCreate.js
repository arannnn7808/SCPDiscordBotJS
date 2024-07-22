const { handleCommandError } = require('../utils/errorHandler');
const cooldownManager = require('../utils/cooldownManager');
const { createErrorEmbed } = require('../utils/embedBuilder');
const logger = require('../utils/logger');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            logger.warn(`Unknown command: ${interaction.commandName}`);
            return;
        }

        const cooldownDuration = command.cooldown || 3;
        const remainingCooldown = cooldownManager.getCooldownRemaining(interaction.user.id, command.data.name);

        if (remainingCooldown > 0) {
            logger.info(`Cooldown active for user ${interaction.user.tag} on command ${command.data.name}`);
            const errorEmbed = createErrorEmbed(
                'Comando en enfriamiento',
                `Por favor, espera ${remainingCooldown} segundos antes de usar el comando \`${command.data.name}\` de nuevo.`
            );
            try {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            } catch (error) {
                if (error.code !== 10062) {  // Ignore "Unknown Interaction" errors
                    logger.error('Error sending cooldown message', error);
                }
            }
            return;
        }

        try {
            logger.info(`Executing command: ${command.data.name} for user ${interaction.user.tag}`);
            await command.execute(interaction);
            cooldownManager.setCooldown(interaction.user.id, command.data.name, cooldownDuration);
        } catch (error) {
            if (error.code === 10062) {  // Unknown Interaction error
                logger.warn(`Interaction expired for command: ${command.data.name}`);
            } else {
                await handleCommandError(interaction, error);
            }
        }
    },
};