require('dotenv').config();
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Repite el mensaje proporcionado.')
        .addStringOption(option => 
            option.setName('message')
                .setDescription('El mensaje que quieres que repita el bot')
                .setRequired(true)),
    async execute(interaction) {
        const roleId = process.env.STAFF_ROLE_ID;
        const member = interaction.member;
        
        if (!member.roles.cache.has(roleId)) {
            return interaction.reply({ content: 'No tienes permisos para usar este comando.', ephemeral: true });
        }

        const message = interaction.options.getString('message');
        await interaction.channel.send(message);
        await interaction.reply({ content: 'Mensaje enviado.', ephemeral: true });
    },
};
