const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/botConfig');
const logger = require('../../utils/logger');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const PROXY_URL = 'https://api.allorigins.win/raw?url=';
const CACHE_DURATION = 60000; // 1 minute cache
const FALLBACK_DURATION = 300000; // 5 minutes fallback duration

let cachedData = null;
let lastFetchTime = 0;
let isUsingFallback = false;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servidor')
        .setDescription('Muestra el estado del servidor y los jugadores activos.'),
    cooldown: 30, // 30 seconds cooldown

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const data = await this.getServerData();
            const embed = this.createServerEmbed(data);
            await interaction.editReply({ embeds: [embed] });
            logger.info(`Server status command executed by ${interaction.user.tag}`);
        } catch (error) {
            logger.error('Error fetching server status', error);
            const fallbackEmbed = this.createFallbackEmbed();
            await interaction.editReply({ embeds: [fallbackEmbed] });
        }
    },

    async getServerData() {
        const now = Date.now();
        if (cachedData && now - lastFetchTime < (isUsingFallback ? FALLBACK_DURATION : CACHE_DURATION)) {
            return cachedData;
        }

        try {
            const data = await this.fetchServerDataWithRetry();
            cachedData = data;
            lastFetchTime = now;
            isUsingFallback = false;
            return data;
        } catch (error) {
            logger.error('Failed to fetch server data, using fallback', error);
            if (!cachedData) {
                throw new Error('No cached data available for fallback');
            }
            isUsingFallback = true;
            return cachedData;
        }
    },

    async fetchServerDataWithRetry(retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                return await this.fetchServerData();
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
            }
        }
    },

    async fetchServerData() {
        const serverId = process.env.SERVER_ID_API;
        if (!serverId) {
            throw new Error('SERVER_ID_API is not set in the environment variables');
        }

        const targetUrl = encodeURIComponent(`${config.serverStatus.apiBaseUrl}${serverId}`);
        const proxyUrl = `${PROXY_URL}${targetUrl}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        this.validateServerData(data);
        return data;
    },

    validateServerData(data) {
        const requiredFields = ['online', 'players', 'version', 'friendlyFire', 'ip', 'port', 'info'];
        for (const field of requiredFields) {
            if (!(field in data)) {
                throw new Error(`Missing required field in server data: ${field}`);
            }
        }
    },

    createServerEmbed(data) {
        const serverName = this.stripHtmlTags(data.info || 'Server Name Not Available');
        const embed = new EmbedBuilder()
            .setColor(data.online ? config.serverStatus.embedColor.online : config.serverStatus.embedColor.offline)
            .addFields(
                { name: 'Nombre', value: serverName, inline: false },
                { name: 'Estado', value: data.online ? config.serverStatusTexts.online : config.serverStatusTexts.offline, inline: true },
                { name: 'Jugadores', value: data.players, inline: true },
                { name: 'Version', value: data.version, inline: true },
                { name: 'Fuego Amigo', value: data.friendlyFire ? config.serverStatusTexts.friendlyFireEnabled : config.serverStatusTexts.friendlyFireDisabled, inline: true }
            )
            .setFooter({ text: `IP: ${data.ip}:${data.port} | ${config.embeds.footerText}${isUsingFallback ? ' | Datos en caché' : ''}` });

        if (process.env.LINK_IMAGE_SERVER) {
            embed.setThumbnail(process.env.LINK_IMAGE_SERVER);
        }

        return embed;
    },

    createFallbackEmbed() {
        return new EmbedBuilder()
            .setColor(config.serverStatus.embedColor.offline)
            .setTitle('Estado del Servidor')
            .setDescription('Lo sentimos, no se pudo obtener la información del servidor en este momento. Por favor, inténtalo de nuevo más tarde.')
            .setFooter({ text: config.embeds.footerText });
    },

    stripHtmlTags(html) {
        return html.replace(/<\/?[^>]+(>|$)/g, "");
    }
};