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
      return interaction.reply({
        embeds: [CustomEmbedBuilder.error("Comando Desconocido", "Este comando no existe.")],
        ephemeral: true
      });
    }

    try {
      await CommandHandler.handle(interaction);
    } catch (error) {
      logger.error(`Error executing ${interaction.commandName}`, { error });
      await interaction.reply({
        embeds: [CustomEmbedBuilder.error("Error de Comando", "Ocurrió un error al ejecutar este comando.")],
        ephemeral: true
      });
    }
  },

  async handleButton(interaction) {
    logger.info(`Interacción de botón: ${interaction.customId}`, {
      userId: interaction.user.id,
      guildId: interaction.guild?.id,
    });

    try {
      if (interaction.customId.startsWith('blackjack_')) {
        const blackjackCommand = interaction.client.commands.get('blackjack');
        if (blackjackCommand) {
          await blackjackCommand.handleButtonInteraction(interaction);
        } else {
          logger.error('Blackjack command not found');
          await interaction.reply({
            content: "Error: Comando de Blackjack no encontrado.",
            ephemeral: true,
          });
        }
      } else if (interaction.customId === "reveal_sender" ||
          interaction.customId.startsWith("cmd_") ||
          interaction.customId.startsWith("back_") ||
          interaction.customId === "warn_previous" ||
          interaction.customId === "warn_next") {
        // These are handled by their respective command collectors
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
      logger.error(`Error handling button interaction: ${interaction.customId}`, { error });
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
      logger.error(`Error handling select menu interaction: ${interaction.customId}`, { error });
      await ErrorHandler.handle(error, interaction);
    }
  },
};