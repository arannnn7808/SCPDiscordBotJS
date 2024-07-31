const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config/botConfig");
const logger = require("../../utils/logger");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const ErrorHandler = require("../../utils/errorHandler");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const PROXY_URL = "https://api.allorigins.win/raw?url=";
const CACHE_DURATION = 60000;
const FALLBACK_DURATION = 300000;
const FETCH_TIMEOUT = 5000;

let cachedData = null;
let lastFetchTime = 0;
let isUsingFallback = false;

module.exports = {
  data: new SlashCommandBuilder()
      .setName("servidor")
      .setDescription("Muestra el estado del servidor y los jugadores activos."),
  folder: "api",
  cooldown: 30,

  async execute(interaction) {
    try {
      const data = await this.getServerData();
      const embed = this.createServerEmbed(data);
      logger.info(`Server status command executed by ${interaction.user.tag}`, {
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
      });
      return [{ embeds: [embed] }];
    } catch (error) {
      logger.error("Error in server status command", { error, interaction });
      await ErrorHandler.handle(error, interaction);
    }
  },

  async getServerData() {
    const now = Date.now();
    if (cachedData && now - lastFetchTime < (isUsingFallback ? FALLBACK_DURATION : CACHE_DURATION)) {
      return cachedData;
    }

    try {
      const data = await this.fetchServerDataWithRetry();
      if (data) {
        cachedData = data;
        lastFetchTime = now;
        isUsingFallback = false;
      } else {
        throw new Error("Received null data from API");
      }
      return data;
    } catch (error) {
      logger.error("Failed to fetch server data, using fallback", { error });
      if (cachedData) {
        isUsingFallback = true;
        return cachedData;
      }
      throw new Error("No data available");
    }
  },

  async fetchServerDataWithRetry(retries = 2) {
    for (let i = 0; i < retries; i++) {
      try {
        const data = await this.fetchServerData();
        if (data) return data;
      } catch (error) {
        logger.warn(`Fetch attempt ${i + 1} failed:`, { error });
        if (i === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    throw new Error(`Failed to fetch data after ${retries} attempts`);
  },

  async fetchServerData() {
    const serverId = process.env.SERVER_ID_API;
    if (!serverId) {
      throw new Error("SERVER_ID_API is not set in the environment variables");
    }

    const targetUrl = encodeURIComponent(`${config.serverStatus.apiBaseUrl}${serverId}`);
    const proxyUrl = `${PROXY_URL}${targetUrl}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data) {
        throw new Error("Received null data from API");
      }
      this.validateServerData(data);
      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out");
      }
      throw error;
    }
  },

  validateServerData(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid server data received");
    }

    const requiredFields = ["online", "players", "version", "friendlyFire", "ip", "port", "info"];
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field in server data: ${field}`);
      }
    }

    data.maxPlayers = data.maxPlayers || "N/A";
  },

  createServerEmbed(data) {
    const serverName = this.stripHtmlTags(data.info || "Server Name Not Available");
    return new CustomEmbedBuilder()
        .setColor(data.online ? config.serverStatus.embedColor.online : config.serverStatus.embedColor.offline)
        .setTitle("Estado del Servidor")
        .addField("Nombre", serverName, false)
        .addField("Estado", data.online ? config.serverStatusTexts.online : config.serverStatusTexts.offline, true)
        .addField("Jugadores", `${data.players}${data.maxPlayers !== "N/A" ? `/${data.maxPlayers}` : ""}`, true)
        .addField("Version", data.version, true)
        .addField("Fuego Amigo", data.friendlyFire ? config.serverStatusTexts.friendlyFireEnabled : config.serverStatusTexts.friendlyFireDisabled, true)
        .setFooter({
          text: `IP: ${data.ip}:${data.port} | ${config.embeds.footerText}${isUsingFallback ? " | Datos en caché" : ""}`,
        })
        .setThumbnail(process.env.LINK_IMAGE_SERVER)
        .build();
  },

  stripHtmlTags(html) {
    return html.replace(/<\/?[^>]+(>|$)/g, "");
  },
};