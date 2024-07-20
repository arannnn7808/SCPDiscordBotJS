const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un usuario del servidor')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario que deseas expulsar')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón de la expulsión')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        const targetUser = interaction.options.getMember('usuario');
        const reason = interaction.options.getString('razon') || 'No se proporcionó razón';

        // Check if the bot has permission to kick members
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ content: 'No tengo permisos para expulsar usuarios.', ephemeral: true });
        }

        // Check if the target user is kickable
        if (!targetUser.kickable) {
            return interaction.reply({ content: 'No puedo expulsar a este usuario. Su rol puede ser más alto que el mío.', ephemeral: true });
        }

        try {
            await targetUser.kick(reason);
            await interaction.reply({ content: `Usuario ${targetUser.user.tag} expulsado correctamente.\nRazón: ${reason}`, ephemeral: true });
        } catch (error) {
            console.error('Error al intentar expulsar al usuario:', error);
            await interaction.reply({ content: 'Hubo un error al intentar expulsar al usuario.', ephemeral: true });
        }
    },
};