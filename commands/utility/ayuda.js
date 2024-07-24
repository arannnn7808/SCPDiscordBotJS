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

      const categorizedCommands = {};
      COMMAND_FOLDERS.forEach((folder) => {
        categorizedCommands[folder] = [];
      });

      // Categorize commands
      commands.forEach((command) => {
        const folder = command.folder || "Otros";
        if (!categorizedCommands[folder]) {
          categorizedCommands[folder] = [];
        }
        categorizedCommands[folder].push(command);
      });

      const embed = new CustomEmbedBuilder()
        .setTitle("Ayuda del Bot")
        .setDescription(
          "Selecciona una categoría para ver los comandos disponibles.",
        )
        .build();

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("help_category")
        .setPlaceholder("Selecciona una categoría");

      Object.keys(categorizedCommands).forEach((folder) => {
        if (categorizedCommands[folder].length > 0) {
          selectMenu.addOptions({
            label: folder.charAt(0).toUpperCase() + folder.slice(1),
            value: folder,
            description: `Ver comandos de ${folder}`,
          });
        }
      });

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const response = await interaction.editReply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });

      const filter = (i) => i.user.id === interaction.user.id;
      const collector = response.createMessageComponentCollector({
        filter,
        time: 300000,
      }); // 5 minutes

      collector.on("collect", async (i) => {
        try {
          if (i.isStringSelectMenu()) {
            const category = i.values[0];
            const categoryCommands = categorizedCommands[category];

            const commandList = categoryCommands
              .map((cmd) => `\`/${cmd.data.name}\`: ${cmd.data.description}`)
              .join("\n");
            const description =
              commandList || "No hay comandos disponibles en esta categoría.";

            const categoryEmbed = new CustomEmbedBuilder()
              .setTitle(
                `Comandos de ${category.charAt(0).toUpperCase() + category.slice(1)}`,
              )
              .setDescription(description)
              .build();

            const buttons = categoryCommands.map((cmd) =>
              new ButtonBuilder()
                .setCustomId(`cmd_${cmd.data.name}`)
                .setLabel(cmd.data.name)
                .setStyle(ButtonStyle.Secondary),
            );

            const buttonRows = [];
            for (let j = 0; j < buttons.length; j += 5) {
              buttonRows.push(
                new ActionRowBuilder().addComponents(buttons.slice(j, j + 5)),
              );
            }

            await i.update({
              embeds: [categoryEmbed],
              components: [row, ...buttonRows],
            });
          } else if (i.isButton()) {
            if (i.customId.startsWith("cmd_")) {
              const commandName = i.customId.split("_")[1];
              const command = client.commands.get(commandName);

              if (!command) {
                throw new CommandError(
                  "COMMAND_NOT_FOUND",
                  `Command not found: ${commandName}`,
                  "error",
                );
              }

              const usage =
                command.data.options?.length > 0
                  ? `/${command.data.name} ${command.data.options.map((opt) => (opt.required ? `<${opt.name}>` : `[${opt.name}]`)).join(" ")}`
                  : `/${command.data.name}`;

              const commandEmbed = new CustomEmbedBuilder()
                .setTitle(`Comando: /${command.data.name}`)
                .setDescription(
                  command.data.description || "No hay descripción disponible.",
                )
                .addField("Uso", usage)
                .addField(
                  "Permisos",
                  command.permissions?.join(", ") || "Ninguno",
                )
                .build();

              const backButton = new ButtonBuilder()
                .setCustomId(`back_${command.folder || "Otros"}`)
                .setLabel("Volver")
                .setStyle(ButtonStyle.Primary);

              await i.update({
                embeds: [commandEmbed],
                components: [new ActionRowBuilder().addComponents(backButton)],
              });
            } else if (i.customId.startsWith("back_")) {
              const category = i.customId.split("_")[1];
              const categoryCommands = categorizedCommands[category];

              const commandList = categoryCommands
                .map((cmd) => `\`/${cmd.data.name}\`: ${cmd.data.description}`)
                .join("\n");
              const description =
                commandList || "No hay comandos disponibles en esta categoría.";

              const categoryEmbed = new CustomEmbedBuilder()
                .setTitle(
                  `Comandos de ${category.charAt(0).toUpperCase() + category.slice(1)}`,
                )
                .setDescription(description)
                .build();

              const buttons = categoryCommands.map((cmd) =>
                new ButtonBuilder()
                  .setCustomId(`cmd_${cmd.data.name}`)
                  .setLabel(cmd.data.name)
                  .setStyle(ButtonStyle.Secondary),
              );

              const buttonRows = [];
              for (let j = 0; j < buttons.length; j += 5) {
                buttonRows.push(
                  new ActionRowBuilder().addComponents(buttons.slice(j, j + 5)),
                );
              }

              await i.update({
                embeds: [categoryEmbed],
                components: [row, ...buttonRows],
              });
            }
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
        interaction.editReply({ components: [] }).catch((error) => {
          logger.error("Error removing components after collector end", {
            error: error.message,
            stack: error.stack,
          });
        });
      });

      logger.info("Help command executed", {
        user: interaction.user.tag,
        guild: interaction.guild?.name,
      });
    } catch (error) {
      logger.error("Error executing help command", {
        error: error.message,
        stack: error.stack,
      });
      await ErrorHandler.handle(error, interaction);
    }
  },
};
