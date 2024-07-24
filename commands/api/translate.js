const { SlashCommandBuilder } = require("discord.js");
const { translate } = require("@vitalets/google-translate-api");
const { banderas } = require("../../config/constants");
const logger = require("../../utils/logger");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const ErrorHandler = require("../../utils/errorHandler");

class CommandError extends Error {
  constructor(code, message, level = "error") {
    super(message);
    this.name = "CommandError";
    this.code = code;
    this.level = level;
  }
}

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
  folder: "utility",
  cooldown: 5,
  async execute(interaction) {
    try {
      const textoATraducir = interaction.options.getString("texto");
      const idiomaDestino = interaction.options.getString("idioma");

      logger.info("Starting translation", {
        user: interaction.user.tag,
        sourceText: textoATraducir,
        targetLanguage: idiomaDestino,
      });

      const resultado = await translate(textoATraducir, { to: idiomaDestino });

      const idiomaDetectado = resultado.raw.src;
      const banderaDestino = banderas[idiomaDestino] || "🏳️";

      const embed = new CustomEmbedBuilder()
        .setTitle("🌐 Traducción")
        .addField("📝 Texto original", textoATraducir)
        .addField("🔄 Traducción", `${banderaDestino} ${resultado.text}`)
        .addField("🌍 Idiomas", `De: ${idiomaDetectado} → A: ${idiomaDestino}`)
        .setFooter({ text: "Traducción realizada con éxito" })
        .build();

      await interaction.editReply({ embeds: [embed] });

      logger.info("Translation completed successfully", {
        user: interaction.user.tag,
        sourceLanguage: idiomaDetectado,
        targetLanguage: idiomaDestino,
      });
    } catch (error) {
      logger.error("Translation failed", {
        error: error.message,
        user: interaction.user.tag,
      });
      await ErrorHandler.handle(
        new CommandError(
          "TRANSLATION_FAILED",
          "Ha ocurrido un error al intentar traducir el texto.",
          "error",
        ),
        interaction,
      );
    }
  },
};
