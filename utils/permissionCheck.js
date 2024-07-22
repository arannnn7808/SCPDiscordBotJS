const { PermissionFlagsBits } = require('discord.js');
const { createErrorEmbed } = require('./embedBuilder');
const logger = require('./logger');

async function checkPermission(interaction, permission) {
    if (!interaction.member.permissions.has(permission)) {
        logger.warn('Permission check failed', {
            command: interaction.commandName,
            user: interaction.user.tag,
            requiredPermission: permission
        });
        const errorEmbed = createErrorEmbed('Error de Permisos', 'No tienes los permisos necesarios para usar este comando.');
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return false;
    }
    return true;
}

module.exports = { checkPermission };