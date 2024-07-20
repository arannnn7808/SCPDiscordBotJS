const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, Collection } = require('discord.js');

const cooldowns = new Collection();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayuda')
        .setDescription('Muestra una lista de todos los comandos disponibles'),
    cooldown: 10, // Cooldown in seconds
    async execute(interaction) {
        // Cooldown check
        const { id } = interaction.user;
        if (cooldowns.has(id)) {
            const expirationTime = cooldowns.get(id) + this.cooldown * 1000;
            if (Date.now() < expirationTime) {
                const timeLeft = (expirationTime - Date.now()) / 1000;
                return interaction.reply({ content: `Por favor, espera ${timeLeft.toFixed(1)} segundos antes de usar el comando \`ayuda\` de nuevo.`, ephemeral: true });
            }
        }

        cooldowns.set(id, Date.now());
        setTimeout(() => cooldowns.delete(id), this.cooldown * 1000);

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