const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const { handleCommandError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un usuario del servidor')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario que deseas banear')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón del ban')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    cooldown: 10,
    async execute(interaction) {
        try {
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
                const errorEmbed = createErrorEmbed('Error de Permisos', 'No tengo permiso para banear miembros en este servidor.');
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                const errorEmbed = createErrorEmbed('Error de Permisos', 'No tienes permiso para banear miembros en este servidor.');
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const targetUser = interaction.options.getMember('usuario');
            if (!targetUser) {
                const errorEmbed = createErrorEmbed('Error', 'El usuario especificado no está en el servidor.');
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const reason = interaction.options.getString('razon');
            
            if (!targetUser.bannable) {
                const errorEmbed = createErrorEmbed('Error', 'No puedo banear a este usuario. Su rol puede ser más alto que el mío.');
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            
            if (targetUser.roles.highest.position >= interaction.member.roles.highest.position) {
                const errorEmbed = createErrorEmbed('Error', 'No puedes banear a un usuario con un rol igual o superior al tuyo.');
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            await interaction.guild.members.ban(targetUser, { reason });
            logger.info(`User ${targetUser.user.tag} was banned by ${interaction.user.tag} for reason: ${reason}`);
            const successEmbed = createSuccessEmbed('Usuario Baneado', `Usuario ${targetUser.user.tag} baneado correctamente por: ${reason}`);
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        } catch (error) {
            logger.error('Error executing ban command', error, {
                command: 'ban',
                user: interaction.user.tag,
                target: interaction.options.getUser('usuario').tag,
                guild: interaction.guild.name,
            });
            await handleCommandError(interaction, error);
        }
    },
};