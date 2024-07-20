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
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon');

        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return await interaction.reply({ content: 'No tienes permisos para expulsar usuarios.', ephemeral: true });
        }

        try {
            await interaction.guild.members.kick(user, reason);
            await interaction.reply({ content: `Usuario ${user.tag} expulsado correctamente por: ${reason}`, ephemeral: true });
        } catch (error) {
            console.error('Error al intentar expulsar al usuario:', error);
            await interaction.reply({ content: 'Hubo un error al intentar expulsar al usuario. Asegúrate de que tengo los permisos necesarios y que el usuario pueda ser expulsado.', ephemeral: true });
        }
    },
};