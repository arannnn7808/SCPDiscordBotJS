const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");
const ErrorHandler = require("../../utils/errorHandler");
const CustomEmbedBuilder = require("../../utils/embedBuilder");

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
      .setName("kick")
      .setDescription("Expulsa a un usuario del servidor")
      .addUserOption((option) =>
          option
              .setName("usuario")
              .setDescription("Usuario que deseas expulsar")
              .setRequired(true),
      )
      .addStringOption((option) =>
          option
              .setName("razon")
              .setDescription("Razón de la expulsión")
              .setRequired(false),
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  folder: "moderation",
  permissions: ["KickMembers"],
  cooldown: 5,
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getMember("usuario");
      const reason =
          interaction.options.getString("razon") || "No se proporcionó razón";

      if (
          !interaction.member.permissions.has(PermissionFlagsBits.KickMembers)
      ) {
        throw new CommandError(
            "MISSING_PERMISSIONS",
            "No tienes permiso para expulsar miembros en este servidor.",
        );
      }

      if (!targetUser) {
        throw new CommandError(
            "USER_NOT_FOUND",
            "El usuario especificado no está en el servidor.",
        );
      }

      if (targetUser.id === interaction.user.id) {
        throw new CommandError(
            "SELF_KICK",
            "No puedes expulsarte a ti mismo.",
            "info",
        );
      }

      if (targetUser.id === interaction.client.user.id) {
        throw new CommandError(
            "BOT_KICK",
            "No puedo expulsarme a mí mismo.",
            "info",
        );
      }

      if (
          interaction.guild.members.me.roles.highest.position <=
          targetUser.roles.highest.position
      ) {
        throw new CommandError(
            "BOT_HIERARCHY_ERROR",
            "No puedo expulsar a este usuario. Su rol es superior o igual al mío.",
            "info",
        );
      }

      if (
          interaction.member.roles.highest.position <=
          targetUser.roles.highest.position
      ) {
        throw new CommandError(
            "USER_HIERARCHY_ERROR",
            "No puedes expulsar a este usuario. Su rol es superior o igual al tuyo.",
            "info",
        );
      }

      await targetUser.kick(reason);

      logger.info(
          `User ${targetUser.user.tag} was kicked by ${interaction.user.tag}`,
          {
            reason: reason,
            guildId: interaction.guild.id,
          },
      );

      const successEmbed = new CustomEmbedBuilder()
          .setTitle("Usuario Expulsado")
          .setDescription(`${targetUser.user.tag} ha sido expulsado del servidor.`)
          .addField("Razón", reason)
          .setColor("#FFA500")
          .build();

      const dmEmbed = new CustomEmbedBuilder()
          .setTitle("Has sido expulsado")
          .setDescription(`Has sido expulsado de ${interaction.guild.name}.`)
          .addField("Razón", reason)
          .setColor("#FFA500")
          .build();

      await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
        logger.warn(`Could not send DM to ${targetUser.user.tag}`);
      });

      return [
        { embeds: [successEmbed] },
        { content: "El usuario ha sido notificado por DM.", ephemeral: true },
      ];
    } catch (error) {
      logger.error("Error in kick command", error, { interaction });
      await ErrorHandler.handle(error, interaction);
    }
  },
};