const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const logger = require("../../utils/logger");
const ErrorHandler = require("../../utils/errorHandler");

class CommandError extends Error {
  constructor(code, message, level = "error") {
    super(message);
    this.name = "CommandError";
    this.code = code;
    this.level = level;
  }
}

function sanitizeMessage(message) {
  message = message.replace(/@/g, "@\u200b");
  message = message.replace(/@\u200beveryone/gi, "`@everyone`");
  message = message.replace(/@\u200bhere/gi, "`@here`");
  message = message.replace(
      /discord(?:app\.com\/invite|\.gg(?:\/invite)?)\/([\w-]{2,255})/gi,
      "[invite removed]",
  );
  const MAX_LENGTH = 2000;
  if (message.length > MAX_LENGTH) {
    message = message.substring(0, MAX_LENGTH - 3) + "...";
  }
  return message;
}

module.exports = {
  data: new SlashCommandBuilder()
      .setName("say")
      .setDescription("Repite el mensaje proporcionado.")
      .addStringOption((option) =>
          option
              .setName("mensaje")
              .setDescription("El mensaje que quieres que repita el bot")
              .setRequired(true)
              .setMaxLength(2000),
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  folder: "utility",
  permissions: ["ManageMessages"],
  cooldown: 5,
  async execute(interaction) {
    try {
      if (
          !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)
      ) {
        throw new CommandError(
            "MISSING_PERMISSIONS",
            "No tienes permisos para usar este comando.",
        );
      }

      const message = interaction.options.getString("mensaje");
      const sanitizedMessage = sanitizeMessage(message);

      if (sanitizedMessage.trim().length === 0) {
        throw new CommandError(
            "EMPTY_MESSAGE",
            "El mensaje no puede estar vacío después de la sanitización.",
        );
      }

      const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
              .setCustomId("reveal_sender")
              .setLabel("Revelar Remitente")
              .setStyle(ButtonStyle.Secondary),
      );

      const sentMessage = await interaction.channel.send({
        content: sanitizedMessage,
        components: [row],
      });

      logger.info(
          `'Say' command executed: message sent by ${interaction.user.tag} in #${interaction.channel.name}`,
          { guildId: interaction.guild.id },
      );

      const successEmbed = new CustomEmbedBuilder()
          .setTitle("Mensaje Enviado")
          .setDescription("El mensaje ha sido enviado exitosamente.")
          .setColor("#00FF00")
          .build();

      const collector = sentMessage.createMessageComponentCollector({
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "reveal_sender") {
          try {
            await i.deferUpdate();
            await i.followUp({
              content: `Este mensaje fue enviado por ${interaction.user.tag}`,
              ephemeral: true,
            });
            logger.info(
                `Sender revealed to ${i.user.tag} for message from ${interaction.user.tag}`,
                { guildId: interaction.guild.id },
            );
          } catch (error) {
            logger.error(`Error revealing sender to ${i.user.tag}:`, error);
          }
        }
      });

      collector.on("end", () => {
        sentMessage.edit({ components: [] }).catch((error) => {
          logger.error("Error removing button after timeout", error);
        });
      });

      return [
        { embeds: [successEmbed], ephemeral: true },
        { content: "El botón de 'Revelar Remitente' estará disponible por 1 minuto.", ephemeral: true }
      ];
    } catch (error) {
      logger.error("Error in say command", error, { interaction });
      await ErrorHandler.handle(error, interaction);
    }
  },
};