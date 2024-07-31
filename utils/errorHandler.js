const { DiscordAPIError } = require("discord.js");
const CustomEmbedBuilder = require("./embedBuilder");
const logger = require("./logger");

class ErrorHandler {
  static async handle(error, interaction) {
    this.logError(error, interaction);
    const responseEmbed = this.createErrorEmbed(error);
    await this.sendErrorResponse(interaction, responseEmbed);
  }

  static logError(error, interaction) {
    const logMethod = error.name === "CommandError" && error.level === "info" ? logger.info : logger.error;
    const logMessage = `An error occurred: ${error.message}`;
    const logContext = {
      commandName: interaction.commandName,
      userId: interaction.user.id,
      guildId: interaction.guild?.id,
      error,
      stack: error.stack
    };
    logMethod.call(logger, logMessage, logContext);
  }

  static createErrorEmbed(error) {
    if (error instanceof DiscordAPIError) return this.handleDiscordAPIError(error);
    if (error.name === "CommandError") return this.handleCommandError(error);
    if (error instanceof TypeError) return this.handleTypeError(error);
    if (error instanceof RangeError) return this.handleRangeError(error);
    if (error instanceof SyntaxError) return this.handleSyntaxError(error);
    return this.handleGenericError(error);
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
    const errorHandlers = {
      USER_NOT_FOUND: () => CustomEmbedBuilder.error("Usuario No Encontrado", `${error.message}\nUbicación: Comando del bot (búsqueda de usuario)`),
      CANNOT_BAN_OWNER: () => CustomEmbedBuilder.error("Acción No Permitida", `${error.message}\nUbicación: Comando de ban`),
      BOT_HIERARCHY_ERROR: () => CustomEmbedBuilder.info("Jerarquía de Roles", `${error.message}\nUbicación: Comando de moderación`),
      USER_HIERARCHY_ERROR: () => CustomEmbedBuilder.info("Jerarquía de Roles", `${error.message}\nUbicación: Comando de moderación`),
      MISSING_PERMISSIONS: () => CustomEmbedBuilder.error("Error de Permisos", `${error.message}\nUbicación: Verificación de permisos del comando`),
      TRANSLATION_FAILED: () => CustomEmbedBuilder.error("Error de Traducción", `${error.message}\nUbicación: Comando de traducción`),
      FETCH_FAILED: () => CustomEmbedBuilder.error("Error de Búsqueda", `${error.message}\nUbicación: Comando de servidor`),
      INVALID_DATA: () => CustomEmbedBuilder.error("Datos Inválidos", `${error.message}\nUbicación: Procesamiento de datos del servidor`),
    };
    return (errorHandlers[error.code] || (() => CustomEmbedBuilder.error("Error de Comando", `${error.message}\nUbicación: Ejecución del comando`)))();
  }

  static handleTypeError(error) {
    const message = error.message.includes("Cannot read property")
        ? `Se intentó acceder a una propiedad de un objeto indefinido. Esto puede deberse a datos faltantes o incorrectos.`
        : `Se ha producido un error de tipo en el bot.`;
    return CustomEmbedBuilder.error("Error de Tipo", `${message}\nMensaje: ${error.message}\nUbicación: ${this.getErrorLocation(error)}`);
  }

  static handleRangeError(error) {
    return CustomEmbedBuilder.error("Error de Rango", `Se ha producido un error de rango.\nMensaje: ${error.message}\nUbicación: ${this.getErrorLocation(error)}`);
  }

  static handleSyntaxError(error) {
    return CustomEmbedBuilder.error("Error de Sintaxis", `Se ha producido un error de sintaxis en el código del bot.\nMensaje: ${error.message}\nUbicación: ${this.getErrorLocation(error)}`);
  }

  static handleGenericError(error) {
    return CustomEmbedBuilder.error("Error Inesperado", `Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde.\nMensaje: ${error.message}\nUbicación: ${this.getErrorLocation(error)}`);
  }

  static getErrorLocation(error) {
    return error.stack.split('\n')[1].trim();
  }

  static async sendErrorResponse(interaction, responseEmbed) {
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