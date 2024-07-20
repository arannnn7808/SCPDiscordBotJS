const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Repite el mensaje proporcionado.')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('El mensaje que quieres que repita el bot')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: 'No tienes permisos para usar este comando.', ephemeral: true });
        }

        const message = interaction.options.getString('message');
        await interaction.channel.send(message);
        await interaction.reply({ content: 'Mensaje enviado.', ephemeral: true });
    },
};