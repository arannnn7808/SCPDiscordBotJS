const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Muestra el estado del servidor y los jugadores activos.'),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const data = await fetchServerData();
            const embed = createServerEmbed(data);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching server data:', error);
            await handleFetchError(interaction, error);
        }
    },
};

// Exportar la información de la api para usarla
async function fetchServerData() {
    const serveridapi = process.env.SERVER_ID_API;
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = `https://api.scplist.kr/api/servers/${serveridapi}`;

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}
// Crear el embed cuando tiene respuesta de la api (json)
function createServerEmbed(data) {
    const estado = data.online ? '🟢 Activo' : '🔴 Inactivo';
    const friendlyfire = data.friendlyFire ? '✅ Activado' : '❌ Desactivado';

    return new EmbedBuilder()
        .setColor(data.online ? '#00FF00' : '#FF0000')
        .setThumbnail(process.env.LINK_IMAGE_SERVER)
        .setTitle('Estado del Servidor')
        .setDescription(process.env.SERVER_NAME_SCPSL)
        .addFields(
            { name: 'Estado', value: estado, inline: true },
            { name: 'Jugadores', value: data.players.toString(), inline: true },
            { name: 'Versión', value: data.version, inline: true },
            { name: 'Fuego Amigo', value: friendlyfire, inline: true }
        )
        .setFooter({ text: `IP: ${data.ip}:${data.port}` })
        .setTimestamp();
}
// No tiene respuesta de la api (json)
async function handleFetchError(interaction, error) {
    const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Error al obtener datos del servidor')
        .setDescription('No se pudo obtener la información del servidor en este momento.')
        .addFields(
            { name: 'Razón', value: error.message || 'Error desconocido' },
            { name: 'Qué hacer', value: 'Por favor, intenta de nuevo más tarde o contacta a un administrador si el problema persiste.' }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
}