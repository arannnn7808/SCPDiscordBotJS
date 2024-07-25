const { DiscordAPIError } = require("discord.js");
const CustomEmbedBuilder = require("./embedBuilder");
const logger = require("./logger");

class ErrorHandler {
  static async handle(error, interaction) {
    if (error.name === "CommandError") {
      if (error.level === "info") {
        logger.info(error.message, { commandName: interaction.commandName, userId: interaction.user.id, guildId: interaction.guild?.id });
      } else {
        logger.error(error.message, { commandName: interaction.commandName, userId: interaction.user.id, guildId: interaction.guild?.id, error });
      }
    } else {
      logger.error(`An error occurred: ${error.message}`, {
        commandName: interaction.commandName,
        userId: interaction.user.id,
        guildId: interaction.guild?.id,
        error,
        stack: error.stack
      });
    }

    let responseEmbed;

    if (error instanceof DiscordAPIError) {
      responseEmbed = this.handleDiscordAPIError(error);
    } else if (error.name === "CommandError") {
      responseEmbed = this.handleCommandError(error);
    } else if (error instanceof TypeError) {
      responseEmbed = this.handleTypeError(error);
    } else if (error instanceof RangeError) {
      responseEmbed = this.handleRangeError(error);
    } else if (error instanceof SyntaxError) {
      responseEmbed = this.handleSyntaxError(error);
    } else {
      responseEmbed = this.handleGenericError(error);
    }

    try {
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [responseEmbed] });
      } else if (interaction.replied) {
        await interaction.followUp({ embeds: [responseEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [responseEmbed], ephemeral: true });
      }
    } catch (replyError) {
      logger.error(`Error sending response message to user: ${replyError.message}`, {
        commandName: interaction.commandName,
        userId: interaction.user.id,
        guildId: interaction.guild?.id,
        error: replyError
      });
    }
  }

  static handleDiscordAPIError(error) {
    const errorMessages = {
      50001: "El bot no tiene acceso al canal o servidor requerido.",
      50013: "El bot no tiene los permisos necesarios para realizar esta acción.",
      50007: "No se puede enviar mensajes al usuario especificado.",
      10003: "Canal no encontrado. Verifica que el canal exista y que el bot tenga acceso.",
      10008: "Mensaje no encontrado. El mensaje puede haber sido eliminado.",
      30005: "Número máximo de roles del servidor alcanzado (250).",
      40005: "Solicitud demasiado grande. Intenta enviar algo más pequeño.",
    };

    const errorMessage = errorMessages[error.code] || `Error de API de Discord (Código: ${error.code})`;
    return CustomEmbedBuilder.error("Error de Discord", `${errorMessage}\nUbicación: API de Discord`);
  }

  static handleCommandError(error) {
    if (error.level === "info") {
      return CustomEmbedBuilder.info("Información", `${error.message}\nUbicación: Comando del bot`);
    }
    switch (error.code) {
      case "USER_NOT_FOUND":
        return CustomEmbedBuilder.error("Usuario No Encontrado", `${error.message}\nUbicación: Comando del bot (búsqueda de usuario)`);
      case "CANNOT_BAN_OWNER":
        return CustomEmbedBuilder.error("Acción No Permitida", `${error.message}\nUbicación: Comando de ban`);
      case "BOT_HIERARCHY_ERROR":
      case "USER_HIERARCHY_ERROR":
        return CustomEmbedBuilder.info("Jerarquía de Roles", `${error.message}\nUbicación: Comando de moderación`);
      case "MISSING_PERMISSIONS":
        return CustomEmbedBuilder.error("Error de Permisos", `${error.message}\nUbicación: Verificación de permisos del comando`);
      case "TRANSLATION_FAILED":
        return CustomEmbedBuilder.error("Error de Traducción", `${error.message}\nUbicación: Comando de traducción`);
      case "FETCH_FAILED":
        return CustomEmbedBuilder.error("Error de Búsqueda", `${error.message}\nUbicación: Comando de servidor`);
      case "INVALID_DATA":
        return CustomEmbedBuilder.error("Datos Inválidos", `${error.message}\nUbicación: Procesamiento de datos del servidor`);
      default:
        return CustomEmbedBuilder.error("Error de Comando", `${error.message}\nUbicación: Ejecución del comando`);
    }
  }

  static handleTypeError(error) {
    if (error.message.includes("Cannot read property")) {
      return CustomEmbedBuilder.error("Error de Tipo", `Se intentó acceder a una propiedad de un objeto indefinido. Esto puede deberse a datos faltantes o incorrectos.\nUbicación: ${error.stack.split('\n')[1].trim()}`);
    }
    return CustomEmbedBuilder.error("Error de Tipo", `Se ha producido un error de tipo en el bot.\nMensaje: ${error.message}\nUbicación: ${error.stack.split('\n')[1].trim()}`);
  }

  static handleRangeError(error) {
    return CustomEmbedBuilder.error("Error de Rango", `Se ha producido un error de rango.\nMensaje: ${error.message}\nUbicación: ${error.stack.split('\n')[1].trim()}`);
  }

  static handleSyntaxError(error) {
    return CustomEmbedBuilder.error("Error de Sintaxis", `Se ha producido un error de sintaxis en el código del bot.\nMensaje: ${error.message}\nUbicación: ${error.stack.split('\n')[1].trim()}`);
  }

  static handleGenericError(error) {
    return CustomEmbedBuilder.error("Error Inesperado", `Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde.\nMensaje: ${error.message}\nUbicación: ${error.stack.split('\n')[1].trim()}`);
  }

  static init(client) {
    process.on("unhandledRejection", (error) => {
      logger.error(`Unhandled promise rejection: ${error.message}`, { error, stack: error.stack });
    });

    process.on("uncaughtException", (error) => {
      logger.error(`Uncaught exception: ${error.message}`, { error, stack: error.stack });
      process.exit(1);
    });

    client.on("error", (error) => {
      logger.error(`Discord client error: ${error.message}`, { error, stack: error.stack });
    });

    client.on("shardError", (error, shardId) => {
      logger.error(`Error on shard ${shardId}: ${error.message}`, { error, stack: error.stack, shardId });
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
          `Se ha producido un error crítico en el bot:\n\`\`\`${error.stack || error.message}\`\`\``
      );
      await owner.send({ embeds: [errorEmbed] });
      logger.info("Error message sent to bot owner");
    } catch (sendError) {
      logger.error(`Failed to send error message to owner: ${sendError.message}`, { error: sendError, stack: sendError.stack });
    }
  }
}

module.exports = ErrorHandler;