const { DiscordAPIError } = require("discord.js");
const CustomEmbedBuilder = require("./embedBuilder");
const logger = require("./logger");

class ErrorHandler {
  static async handle(error, interaction) {
    if (error.name === "CommandError") {
      if (error.level === "info") {
        logger.info(error.message);
      } else {
        logger.error(error.message);
      }
    } else {
      logger.error(`An error occurred: ${error.message}`);
    }

    let responseEmbed;

    if (error instanceof DiscordAPIError) {
      responseEmbed = this.handleDiscordAPIError(error);
    } else if (error.name === "CommandError") {
      responseEmbed = this.handleCommandError(error);
    } else if (error instanceof TypeError) {
      responseEmbed = this.handleTypeError(error);
    } else {
      responseEmbed = CustomEmbedBuilder.error(
        "Error Inesperado",
        "Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde.",
      );
    }

    try {
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [responseEmbed] });
      } else if (interaction.replied) {
        await interaction.followUp({
          embeds: [responseEmbed],
          ephemeral: true,
        });
      } else {
        await interaction.reply({ embeds: [responseEmbed], ephemeral: true });
      }
    } catch (replyError) {
      logger.error(
        `Error sending response message to user: ${replyError.message}`,
      );
    }
  }

  static handleDiscordAPIError(error) {
    switch (error.code) {
      case 50001:
        return CustomEmbedBuilder.error(
          "Error de Permisos",
          "El bot no tiene los permisos necesarios para realizar esta acción.",
        );
      case 50013:
        return CustomEmbedBuilder.error(
          "Permisos Insuficientes",
          "No tienes los permisos necesarios para realizar esta acción.",
        );
      default:
        return CustomEmbedBuilder.error(
          "Error de API de Discord",
          `Ha ocurrido un error en la API de Discord. Código: ${error.code}`,
        );
    }
  }

  static handleCommandError(error) {
    if (error.level === "info") {
      return CustomEmbedBuilder.info("Información", error.message);
    }
    switch (error.code) {
      case "USER_NOT_FOUND":
        return CustomEmbedBuilder.error("Usuario No Encontrado", error.message);
      case "CANNOT_BAN_OWNER":
        return CustomEmbedBuilder.error("Acción No Permitida", error.message);
      case "BOT_HIERARCHY_ERROR":
      case "USER_HIERARCHY_ERROR":
        return CustomEmbedBuilder.info("Jerarquía de Roles", error.message);
      case "MISSING_PERMISSIONS":
        return CustomEmbedBuilder.error("Error de Permisos", error.message);
      default:
        return CustomEmbedBuilder.error("Error de Comando", error.message);
    }
  }

  static handleTypeError(error) {
    if (error.message.includes("Cannot read property")) {
      return CustomEmbedBuilder.error(
        "Error de Datos",
        "Se intentó acceder a una propiedad inexistente. Esto podría deberse a datos faltantes o incorrectos.",
      );
    }
    return CustomEmbedBuilder.error(
      "Error de Tipo",
      "Ha ocurrido un error de tipo en el código. Por favor, reporta este problema.",
    );
  }

  static init(client) {
    process.on("unhandledRejection", (error) => {
      logger.error(`Unhandled promise rejection: ${error.message}`);
    });

    process.on("uncaughtException", (error) => {
      logger.error(`Uncaught exception: ${error.message}`);
      process.exit(1);
    });

    client.on("error", (error) => {
      logger.error(`Discord client error: ${error.message}`);
    });

    client.on("shardError", (error, shardId) => {
      logger.error(`Error on shard ${shardId}: ${error.message}`);
    });
  }

  static async sendErrorToOwner(client, error) {
    const ownerId = process.env.OWNER_ID;
    if (!ownerId) {
      logger.error("OWNER_ID not set in environment variables");
      return;
    }

    try {
      const owner = await client.users.fetch(ownerId);
      const errorEmbed = CustomEmbedBuilder.error(
        "Error Crítico",
        error.stack || error.message,
      );
      await owner.send({ embeds: [errorEmbed] });
      logger.info("Error message sent to bot owner");
    } catch (sendError) {
      logger.error(
        `Failed to send error message to owner: ${sendError.message}`,
      );
    }
  }
}

module.exports = ErrorHandler;
