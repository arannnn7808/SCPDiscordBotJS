const { handleCommandError } = require("../utils/errorHandler");
const cooldownManager = require("../utils/cooldownManager");
const { createErrorEmbed } = require("../utils/embedBuilder");
const logger = require("../utils/logger");
const { Collection } = require("discord.js");

const globalCooldown = new Collection();

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Unknown command: ${interaction.commandName}`);
      return;
    }

    try {
      // Global cooldown check (1 second per guild)
      const now = Date.now();
      const guildCooldownKey = `${interaction.guildId}-global`;
      const guildCooldown = globalCooldown.get(guildCooldownKey) || 0;

      if (now < guildCooldown) {
        const timeLeft = (guildCooldown - now) / 1000;
        logger.info(`Global cooldown active for guild ${interaction.guildId}`);
        await this.sendCooldownMessage(interaction, timeLeft);
        return;
      }

      globalCooldown.set(guildCooldownKey, now + 1000); // 1 second cooldown

      // Command-specific cooldown check
      const cooldownDuration = command.cooldown || 3;
      const remainingCooldown = cooldownManager.getCooldownRemaining(
        interaction.user.id,
        command.data.name,
      );

      if (remainingCooldown > 0) {
        logger.info(
          `Cooldown active for user ${interaction.user.tag} on command ${command.data.name}`,
        );
        await this.sendCooldownMessage(
          interaction,
          remainingCooldown,
          command.data.name,
        );
        return;
      }

      // Execute command
      logger.info(
        `Executing command: ${command.data.name} for user ${interaction.user.tag}`,
      );
      await command.execute(interaction);

      // Set cooldown after successful execution
      cooldownManager.setCooldown(
        interaction.user.id,
        command.data.name,
        cooldownDuration,
      );
    } catch (error) {
      await this.handleInteractionError(interaction, command, error);
    } finally {
      // Clear expired cooldowns periodically
      if (Math.random() < 0.1) {
        // 10% chance to clear on each interaction
        cooldownManager.clearExpiredCooldowns();
      }
    }
  },

  async sendCooldownMessage(
    interaction,
    timeLeft,
    commandName = "this action",
  ) {
    const errorEmbed = createErrorEmbed(
      "Cooldown Active",
      `Please wait ${timeLeft.toFixed(1)} seconds before using ${commandName} again.`,
    );

    try {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    } catch (error) {
      if (error.code !== 10062) {
        logger.error("Error sending cooldown message", error);
      }
    }
  },

  async handleInteractionError(interaction, command, error) {
    const errorCode = error.code ?? "UNKNOWN";
    const errorMessage = error.message ?? "An unknown error occurred";

    logger.error(`Error executing command ${command.data.name}`, {
      errorCode,
      errorMessage,
      user: interaction.user.tag,
      guild: interaction.guild?.name ?? "DM",
    });

    if (errorCode === 10062) {
      logger.warn(`Interaction expired for command: ${command.data.name}`);
      return; // We can't respond to an expired interaction, so we just log it and return
    }

    const userErrorMessage =
      "An error occurred while executing the command. Please try again later.";
    const errorEmbed = createErrorEmbed("Command Error", userErrorMessage);

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    } catch (replyError) {
      if (replyError.code !== 10062) {
        logger.error("Error sending error message to user", {
          errorCode: replyError.code,
          errorMessage: replyError.message,
          command: command.data.name,
          user: interaction.user.tag,
          guild: interaction.guild?.name ?? "DM",
        });
      }
    }

    // Call the general error handler for additional processing if needed
    await handleCommandError(interaction, error);
  },
};
