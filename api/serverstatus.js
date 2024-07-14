const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Muestra el estado del servidor y los jugadores activos.'),
    async execute(interaction) {
        const serveridapi = process.env.SERVER_ID_API;
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const targetUrl = `https://api.scplist.kr/api/servers/${serveridapi}`;

        try {
            // Usar import() dinámico para cargar node-fetch
            const fetch = (await import('node-fetch')).default;
            
            const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const estado = data.online ? 'Activo' : 'Inactivo';
            const friendlyfire = data.friendlyFire ? 'Activado' : 'Desactivado';

            // Crear un nuevo embed
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setThumbnail(process.env.LINK_IMAGE_SERVER)
                .setTitle('Estado del Servidor')
                .setDescription(process.env.SERVER_NAME_SCPSL)
                .addFields(
                    { name: 'Jugadores', value: data.players, inline: true },
                    { name: 'Versión', value: data.version, inline: true },
                    { name: 'Fuego Amigo', value: friendlyfire, inline: true },
                    { name: 'Estado', value: estado, inline: true },
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply(`Error al cargar los datos del servidor: ${error.message}`);
        }
    },
};
