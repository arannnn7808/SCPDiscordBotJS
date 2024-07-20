const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon');

        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return await interaction.reply({ content: 'No tienes permisos para banear usuarios.', ephemeral: true });
        }

        try {
            await interaction.guild.members.ban(user, { reason });
            await interaction.reply({ content: `Usuario ${user.tag} baneado correctamente por: ${reason}`, ephemeral: true });
        } catch (error) {
            console.error('Error al intentar banear al usuario:', error);
            await interaction.reply({ content: 'Hubo un error al intentar banear al usuario. Asegúrate de que tengo los permisos necesarios y que el usuario pueda ser baneado.', ephemeral: true });
        }
    },
};