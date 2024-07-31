const { Collection } = require("discord.js");
const logger = require("./logger");
const ErrorHandler = require("./errorHandler");
const PermissionCheck = require("./permissionCheck");

class CommandHandler {
  constructor() {
    this.cooldowns = new Collection();
  }

  init(client) {
    this.client = client;
    logger.info("Command handler initialized");
  }

  async handle(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await this.prepareInteraction(interaction, command);
      if (!(await this.checkPermissions(interaction, command))) return;

      const cooldownCheck = await this.checkCooldown(interaction, command);
      if (!cooldownCheck.result) {
        return await this.sendResponse(interaction, cooldownCheck.response);
      }

      const commandResponse = await command.execute(interaction);
      if (commandResponse) {
        if (Array.isArray(commandResponse)) {
          await this.sendMultiResponse(interaction, commandResponse);
        } else if (typeof commandResponse === 'object' && commandResponse.response) {
          const message = await this.sendResponse(interaction, commandResponse.response);
          if (typeof commandResponse.afterResponse === 'function') {
            commandResponse.afterResponse(message);
          }
        } else {
          await this.sendResponse(interaction, commandResponse);
        }
      }

      logger.command(command.data.name, interaction.user, interaction.guild);
    } catch (error) {
      await ErrorHandler.handle(error, interaction);
    }
  }

  async prepareInteraction(interaction, command) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: command.ephemeral || false });
    }
  }

  async sendResponse(interaction, response) {
    if (!response) return;

    try {
      let message;
      if (interaction.deferred || interaction.replied) {
        message = await interaction.editReply(response);
      } else {
        message = await interaction.reply({ ...response, fetchReply: true });
      }
      return message;
    } catch (error) {
      logger.error("Error sending command response", {
        error: error.message,
        stack: error.stack,
        commandName: interaction.commandName,
      });
    }
  }

  async sendMultiResponse(interaction, responses) {
    if (!responses || responses.length === 0) return;

    try {
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        if (i === 0) {
          await this.sendResponse(interaction, response);
        } else {
          await interaction.followUp(response);
        }
      }
    } catch (error) {
      logger.error("Error sending multi-response", {
        error: error.message,
        stack: error.stack,
        commandName: interaction.commandName,
      });
    }
  }

  async checkPermissions(interaction, command) {
    if (command.permissions) {
      const hasPermission = await PermissionCheck.check(interaction, command.permissions);
      if (!hasPermission) {
        logger.warn(`Permission check failed for command: ${command.data.name}`, {
          userId: interaction.user.id,
          guildId: interaction.guild?.id,
        });
        return false;
      }
    }
    return true;
  }

  async checkCooldown(interaction, command) {
    if (!command.cooldown) return { result: true };

    if (!this.cooldowns.has(command.data.name)) {
      this.cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = this.cooldowns.get(command.data.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return {
          result: false,
          response: {
            content: `Por favor, espera ${timeLeft.toFixed(1)} segundos más antes de usar el comando \`${command.data.name}\` de nuevo.`,
            ephemeral: true
          }
        };
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    return { result: true };
  }
}

module.exports = new CommandHandler();