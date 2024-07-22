const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

function sanitizeMessage(message) {
    message = message.replace(/@(everyone|here)/g, '@\u200b$1');

    const MAX_LENGTH = 2000;
    if (message.length > MAX_LENGTH) {
        message = message.substring(0, MAX_LENGTH - 3) + '...';
    }

    return message;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Repite el mensaje proporcionado.')
        .addStringOption(option =>
            option.setName('mensaje')
                .setDescription('El mensaje que quieres que repita el bot')
                .setRequired(true)
                .setMaxLength(2000))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    cooldown: 5,
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            logger.warn(`User ${interaction.user.tag} attempted to use 'say' command without permissions`);
            const errorEmbed = createErrorEmbed('Error de Permisos', 'No tienes permisos para usar este comando.');
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const message = interaction.options.getString('mensaje');
        const sanitizedMessage = sanitizeMessage(message);

        if (sanitizedMessage.trim().length === 0) {
            const errorEmbed = createErrorEmbed('Error', 'El mensaje no puede estar vacío después de la sanitización.');
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('reveal_sender')
                        .setLabel('Revelar Remitente')
                        .setStyle(ButtonStyle.Secondary)
                );

            const sentMessage = await interaction.channel.send({
                content: sanitizedMessage,
                components: [row]
            });

            logger.info(`'Say' command executed: message sent by ${interaction.user.tag} in #${interaction.channel.name}`);

            const successEmbed = createSuccessEmbed('Mensaje Enviado', 'El mensaje ha sido enviado exitosamente.');
            await interaction.editReply({ embeds: [successEmbed] });

            const collector = sentMessage.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'reveal_sender') {
                    try {
                        await i.deferUpdate();
                        await i.followUp({ content: `Este mensaje fue enviado por ${interaction.user.tag}`, ephemeral: true });
                        logger.info(`Sender revealed to ${i.user.tag} for message from ${interaction.user.tag}`);
                    } catch (error) {
                        logger.error(`Error revealing sender to ${i.user.tag}:`, error);
                        await i.followUp({ content: 'Hubo un error al revelar el remitente.', ephemeral: true }).catch(e => logger.error('Error sending error message:', e));
                    }
                }
            });

            collector.on('end', collected => {
                logger.debug(`'Say' command collector ended. Total interactions: ${collected.size}`);
                sentMessage.edit({ components: [] }).catch(error => {
                    logger.error('Error removing button after timeout', error);
                });
            });
        } catch (error) {
            logger.error(`Error executing 'say' command for ${interaction.user.tag}:`, error);
            const errorEmbed = createErrorEmbed('Error', 'Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.');
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};