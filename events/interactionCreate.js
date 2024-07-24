const { Events } = require("discord.js");
const CommandHandler = require("../utils/commandHandler");
const logger = require("../utils/logger");
const CustomEmbedBuilder = require("../utils/embedBuilder");
const ErrorHandler = require("../utils/errorHandler");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        await this.handleCommand(interaction);
      } else if (interaction.isButton()) {
        await this.handleButton(interaction);
      } else if (interaction.isStringSelectMenu()) {
        await this.handleSelectMenu(interaction);
      }
    } catch (error) {
      await ErrorHandler.handle(error, interaction);
    }
  },

  async handleCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`No command matching ${interaction.commandName} was found.`);
      const errorEmbed = new CustomEmbedBuilder()
        .setTitle("Comando Desconocido")
        .setDescription("Este comando no existe.")
        .setColor("#FF0000")
        .build();
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    try {
      await CommandHandler.handle(interaction);
    } catch (error) {
      logger.error(`Error executing ${interaction.commandName}`, {
        error: error.message,
        stack: error.stack,
      });
      const errorEmbed = new CustomEmbedBuilder()
        .setTitle("Error de Comando")
        .setDescription("Ocurrió un error al ejecutar este comando.")
        .setColor("#FF0000")
        .build();
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },

  async handleButton(interaction) {
    logger.info(`Interacción de botón: ${interaction.customId}`, {
      userId: interaction.user.id,
      guildId: interaction.guild?.id,
    });

    try {
      if (interaction.customId === "reveal_sender") {
        // This is now handled in the say.js command file
        return;
      } else if (
        interaction.customId.startsWith("cmd_") ||
        interaction.customId.startsWith("back_")
      ) {
        // These are handled by the help command collector
        return;
      } else {
        logger.warn(`Prefijo de botón desconocido: ${interaction.customId}`, {
          userId: interaction.user.id,
          guildId: interaction.guild?.id,
        });
        await interaction.reply({
          content: "Este botón no es reconocido.",
          ephemeral: true,
        });
      }
    } catch (error) {
      logger.error(
        `Error handling button interaction: ${interaction.customId}`,
        { error: error.message, stack: error.stack },
      );
      await ErrorHandler.handle(error, interaction);
    }
  },

  async handleSelectMenu(interaction) {
    logger.info(`Interacción de menú de selección: ${interaction.customId}`, {
      userId: interaction.user.id,
      guildId: interaction.guild?.id,
    });

    try {
      if (interaction.customId === "help_category") {
        // This is handled by the help command collector
        return;
      } else {
        logger.warn(`Menú de selección desconocido: ${interaction.customId}`, {
          userId: interaction.user.id,
          guildId: interaction.guild?.id,
        });
        await interaction.reply({
          content: "Este menú de selección no es reconocido.",
          ephemeral: true,
        });
      }
    } catch (error) {
      logger.error(
        `Error handling select menu interaction: ${interaction.customId}`,
        { error: error.message, stack: error.stack },
      );
      await ErrorHandler.handle(error, interaction);
    }
  },
};
