const { createErrorEmbed } = require('./embedBuilder');
const logger = require('./logger');

const ERROR_MESSAGES = {
    50013: 'No tengo los permisos necesarios para realizar esta acción.',
    50007: 'No puedo enviar mensajes al usuario especificado.',
    10003: 'El canal especificado no existe.',
    10008: 'El mensaje especificado no existe.',
    30005: 'No se pudo cambiar el apodo del usuario.',
    50001: 'No tengo acceso al canal especificado.',
    10007: 'El usuario especificado no está en el servidor.',
    10062: 'La interacción ha expirado.',
    40060: 'La interacción ya ha sido reconocida.',
};

async function handleCommandError(interaction, error) {
    logger.error('Command execution error', error, {
        command: interaction.commandName,
        user: interaction.user.tag,
        guild: interaction.guild?.name || 'DM'
    });

    let errorMessage = ERROR_MESSAGES[error.code] ||
        'Ha ocurrido un error al procesar tu comando. Por favor, inténtalo de nuevo más tarde.';

    if (error.code) {
        errorMessage += ` (Código de error: ${error.code})`;
    }

    const errorEmbed = createErrorEmbed('Error al ejecutar el comando', errorMessage);

    try {
        if (error.code === 10062 || error.code === 40060) {
            // For "Unknown Interaction" or "Interaction already acknowledged" errors,
            // we can't respond to the interaction, so we'll just log it
            logger.warn(`Interaction issue: ${errorMessage}`);
        } else if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        } else {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }
    } catch (replyError) {
        logger.error('Error sending error message to user', replyError, {
            command: interaction.commandName,
            user: interaction.user.tag,
            guild: interaction.guild?.name || 'DM'
        });
    }
}

module.exports = {
    handleCommandError
};