const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const { handleCommandError } = require('../../utils/errorHandler');
const { checkPermission } = require('../../utils/permissionCheck');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un usuario del servidor')
        .addUserOption((option) =>
            option.setName('usuario').setDescription('Usuario que deseas expulsar').setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('razon').setDescription('Razón de la expulsión').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    cooldown: 10, // 10 seconds cooldown
    async execute(interaction) {
        try {
            if (!(await checkPermission(interaction, PermissionFlagsBits.KickMembers))) {
                return;
            }

            const targetUser = interaction.options.getMember('usuario');
            if (!targetUser) {
                const errorEmbed = createErrorEmbed('Error', 'El usuario especificado no está en el servidor.');
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const reason = interaction.options.getString('razon') || 'No se proporcionó razón';

            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
                await this.handleLackOfBotPermission(interaction);
                return;
            }

            if (!targetUser.kickable) {
                await this.handleUnkickableUser(interaction, targetUser);
                return;
            }

            await this.performKick(interaction, targetUser, reason);
        } catch (error) {
            logger.error('Error executing kick command', error, {
                command: 'kick',
                user: interaction.user.tag,
                guild: interaction.guild.name,
            });
            await handleCommandError(interaction, error);
        }
    },

    async handleLackOfBotPermission(interaction) {
        logger.warn(`Bot lacks kick permission in guild ${interaction.guild.name}`);
        const errorEmbed = createErrorEmbed(
            'Error de Permisos',
            'No tengo permiso para expulsar miembros. Por favor, revisa mis permisos en el servidor.'
        );
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    },

    async handleUnkickableUser(interaction, targetUser) {
        logger.warn(`Attempted to kick user ${targetUser.user.tag} who is not kickable`);
        const errorEmbed = createErrorEmbed(
            'Usuario No Expulsable',
            'No puedo expulsar a este usuario. Su rol puede ser más alto que el mío.'
        );
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    },

    async performKick(interaction, targetUser, reason) {
        try {
            await targetUser.kick(reason);
            logger.info(`User ${targetUser.user.tag} was kicked by ${interaction.user.tag} for reason: ${reason}`);
            const successEmbed = createSuccessEmbed(
                'Usuario Expulsado',
                `Usuario ${targetUser.user.tag} expulsado correctamente.\nRazón: ${reason}`
            );
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ embeds: [successEmbed], ephemeral: true });
            }
        } catch (error) {
            logger.error('Error kicking user', error, {
                command: 'kick',
                user: interaction.user.tag,
                target: targetUser.user.tag,
                guild: interaction.guild.name,
            });
            await handleCommandError(interaction, error);
        }
    },
};