const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayuda')
        .setDescription('Muestra una lista de todos los comandos disponibles'),
    async execute(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Comandos de Ayuda')
            .setDescription('Aquí tienes una lista de todos los comandos disponibles')
            .addFields(
                { name: '/ban', value: 'Banea a un usuario del servidor. Uso: /ban [usuario] [razón]' },
                { name: '/kick', value: 'Expulsa a un usuario del servidor. Uso: /kick [usuario] [razón]' },
                { name: '/say', value: 'El bot repite el mensaje que le indiques. Uso: /say [mensaje]' },
                { name: '/server', value: 'Muestra el estado del servidor. Uso: /server' },
                { name: '/ayuda', value: 'Muestra esta lista de comandos.' }
            )
            .setTimestamp()
            .setFooter({ text: 'Bot de Ayuda', iconURL: process.env.LINK_IMAGE_SERVER });

        await interaction.reply({ embeds: [helpEmbed] });
    },
};