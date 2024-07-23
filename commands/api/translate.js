const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { translate } = require("@vitalets/google-translate-api");
const { banderas } = require("../../config/constants");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("traducir")
    .setDescription("Traduce un texto a otro idioma")
    .addStringOption((option) =>
      option
        .setName("texto")
        .setDescription("El texto que quieres traducir")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("idioma")
        .setDescription("Selecciona el idioma al que quieres traducir")
        .setRequired(true)
        .addChoices(
          { name: "🇪🇸 Español", value: "es" },
          { name: "🇺🇸 English", value: "en" },
          { name: "🇫🇷 Français", value: "fr" },
          { name: "🇩🇪 Deutsch", value: "de" },
          { name: "🇮🇹 Italiano", value: "it" },
          { name: "🇵🇹 Português", value: "pt" },
          { name: "🇯🇵 日本語", value: "ja" },
          { name: "🇨🇳 中文 (简体)", value: "zh-CN" },
          { name: "🇷🇺 Русский", value: "ru" },
          { name: "🇰🇷 한국어", value: "ko" },
        ),
    ),
  cooldown: 5,
  async execute(interaction) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
      }

      const textoATraducir = interaction.options.getString("texto");
      const idiomaDestino = interaction.options.getString("idioma");

      const resultado = await translate(textoATraducir, { to: idiomaDestino });

      const { franc } = await import("franc");
      const idiomaOrigen = franc(textoATraducir);

      const banderaOrigen = banderas[idiomaOrigen] || "🏳️";
      const banderaDestino = banderas[idiomaDestino] || "🏳️";

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("🌐 Traducción")
        .addFields(
          {
            name: "📝 Texto original",
            value: `${banderaOrigen} ${textoATraducir}`,
          },
          {
            name: "🔄 Traducción",
            value: `${banderaDestino} ${resultado.text}`,
          },
          {
            name: "🌍 Idiomas",
            value: `De: ${banderaOrigen} ${idiomaOrigen} → A: ${banderaDestino} ${idiomaDestino}`,
          },
        )
        .setFooter({ text: "Traducción realizada con éxito" });

      await interaction.editReply({ embeds: [embed] });
      logger.info("Translation performed", {
        command: "translate",
        user: interaction.user.tag,
        sourceLanguage: idiomaOrigen,
        targetLanguage: idiomaDestino,
      });
    } catch (error) {
      logger.error("Error in translation command", error, {
        command: "translate",
        user: interaction.user.tag,
        targetLanguage: interaction.options.getString("idioma"),
      });

      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Error de Traducción")
        .setDescription(
          "Hubo un error al procesar la traducción. Por favor, inténtalo de nuevo más tarde.",
        );

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    }
  },
};
