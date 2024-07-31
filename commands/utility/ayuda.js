const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const { COMMAND_FOLDERS } = require("../../config/constants");
const ErrorHandler = require("../../utils/errorHandler");
const logger = require("../../utils/logger");

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
      .setName("ayuda")
      .setDescription("Muestra información sobre los comandos disponibles"),
  async execute(interaction) {
    try {
      const client = interaction.client;
      const commands = Array.from(client.commands.values());
      const categorizedCommands = this.categorizeCommands(commands);
      const embed = this.createInitialEmbed();
      const components = this.createInitialComponents(categorizedCommands);

      const response = {
        embeds: [embed],
        components: components,
        ephemeral: true,
      };

      logger.info("Help command executed", {
        user: interaction.user.tag,
        guild: interaction.guild?.name,
      });

      return {
        response,
        afterResponse: (message) => this.setupCollector(message, interaction, categorizedCommands)
      };
    } catch (error) {
      logger.error("Error executing help command", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  },

  categorizeCommands(commands) {
    const categorized = {};
    COMMAND_FOLDERS.forEach((folder) => {
      categorized[folder] = commands.filter((cmd) => cmd.folder === folder);
    });
    return categorized;
  },

  createInitialEmbed() {
    return new CustomEmbedBuilder()
        .setTitle("Ayuda del Bot")
        .setDescription("Selecciona una categoría para ver los comandos disponibles.")
        .build();
  },

  createInitialComponents(categorizedCommands) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("help_category")
        .setPlaceholder("Selecciona una categoría");

    Object.entries(categorizedCommands).forEach(([folder, commands]) => {
      if (commands.length > 0) {
        selectMenu.addOptions({
          label: folder.charAt(0).toUpperCase() + folder.slice(1),
          value: folder,
          description: `Ver comandos de ${folder}`,
        });
      }
    });

    return [new ActionRowBuilder().addComponents(selectMenu)];
  },

  setupCollector(message, interaction, categorizedCommands) {
    const filter = (i) => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({
      filter,
      time: 300000,
    });

    collector.on("collect", async (i) => {
      try {
        if (i.isStringSelectMenu()) {
          await this.handleCategorySelect(i, categorizedCommands);
        } else if (i.isButton()) {
          await this.handleButtonInteraction(i, interaction.client, categorizedCommands);
        }
      } catch (error) {
        logger.error("Error in help command interaction", {
          error: error.message,
          stack: error.stack,
        });
        await ErrorHandler.handle(error, i);
      }
    });

    collector.on("end", () => {
      message.edit({ components: [] }).catch((error) => {
        logger.error("Error removing components after collector end", {
          error: error.message,
          stack: error.stack,
        });
      });
    });
  },

  async handleCategorySelect(interaction, categorizedCommands) {
    const category = interaction.values[0];
    const categoryCommands = categorizedCommands[category];
    const embed = this.createCategoryEmbed(category, categoryCommands);
    const components = this.createCategoryComponents(categoryCommands);
    await interaction.update({
      embeds: [embed],
      components: components,
    });
  },

  async handleButtonInteraction(interaction, client, categorizedCommands) {
    if (interaction.customId.startsWith("cmd_")) {
      await this.showCommandDetails(interaction, client, categorizedCommands);
    } else if (interaction.customId === "back_main") {
      const embed = this.createInitialEmbed();
      const components = this.createInitialComponents(categorizedCommands);
      await interaction.update({
        embeds: [embed],
        components: components,
      });
    } else if (interaction.customId.startsWith("back_")) {
      const category = interaction.customId.split("_")[1];
      await this.showCategoryCommands(interaction, categorizedCommands, category);
    }
  },

  createCategoryEmbed(category, commands) {
    const commandList = commands
        .map((cmd) => `\`/${cmd.data.name}\`: ${cmd.data.description}`)
        .join("\n");
    const description = commandList || "No hay comandos disponibles en esta categoría.";

    return new CustomEmbedBuilder()
        .setTitle(`Comandos de ${category.charAt(0).toUpperCase() + category.slice(1)}`)
        .setDescription(description)
        .build();
  },

  createCategoryComponents(commands) {
    const buttons = commands.map((cmd) =>
        new ButtonBuilder()
            .setCustomId(`cmd_${cmd.data.name}`)
            .setLabel(cmd.data.name)
            .setStyle(ButtonStyle.Secondary),
    );

    const backButton = new ButtonBuilder()
        .setCustomId("back_main")
        .setLabel("Volver al Inicio")
        .setStyle(ButtonStyle.Primary);

    const buttonRows = [new ActionRowBuilder().addComponents(backButton)];
    for (let j = 0; j < buttons.length; j += 5) {
      buttonRows.push(
          new ActionRowBuilder().addComponents(buttons.slice(j, j + 5)),
      );
    }

    return buttonRows;
  },

  async showCommandDetails(interaction, client, categorizedCommands) {
    const commandName = interaction.customId.split("_")[1];
    const command = client.commands.get(commandName);

    if (!command) {
      throw new CommandError(
          "COMMAND_NOT_FOUND",
          `Command not found: ${commandName}`,
          "error",
      );
    }

    const usage = command.data.options?.length > 0
        ? `/${command.data.name} ${command.data.options.map((opt) => (opt.required ? `<${opt.name}>` : `[${opt.name}]`)).join(" ")}`
        : `/${command.data.name}`;

    const commandEmbed = new CustomEmbedBuilder()
        .setTitle(`Comando: /${command.data.name}`)
        .setDescription(command.data.description || "No hay descripción disponible.")
        .addField("Uso", usage)
        .addField("Permisos", command.permissions?.join(", ") || "Ninguno")
        .build();

    const backButton = new ButtonBuilder()
        .setCustomId(`back_${command.folder || "Otros"}`)
        .setLabel("Volver a la Categoría")
        .setStyle(ButtonStyle.Primary);

    await interaction.update({
      embeds: [commandEmbed],
      components: [new ActionRowBuilder().addComponents(backButton)],
    });
  },

  async showCategoryCommands(interaction, categorizedCommands, category) {
    const categoryCommands = categorizedCommands[category];
    const embed = this.createCategoryEmbed(category, categoryCommands);
    const components = this.createCategoryComponents(categoryCommands);
    await interaction.update({
      embeds: [embed],
      components: components,
    });
  },
};