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
      .setName("ban")
      .setDescription("Banea a un usuario del servidor")
      .addUserOption((option) =>
          option
              .setName("usuario")
              .setDescription("Usuario que deseas banear")
              .setRequired(true),
      )
      .addStringOption((option) =>
          option.setName("razon").setDescription("Razón del ban").setRequired(true),
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  folder: "moderation",
  permissions: ["BanMembers"],
  cooldown: 5,
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getMember("usuario");
      const reason = interaction.options.getString("razon");

      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        throw new CommandError(
            "MISSING_PERMISSIONS",
            "No tienes permiso para banear miembros en este servidor.",
        );
      }

      if (!targetUser) {
        throw new CommandError(
            "USER_NOT_FOUND",
            "El usuario especificado no está en el servidor.",
        );
      }

      if (targetUser.id === interaction.guild.ownerId) {
        throw new CommandError(
            "CANNOT_BAN_OWNER",
            "No puedes banear al dueño del servidor.",
            "info",
        );
      }

      if (
          interaction.guild.members.me.roles.highest.position <=
          targetUser.roles.highest.position
      ) {
        throw new CommandError(
            "BOT_HIERARCHY_ERROR",
            "No puedo banear a este usuario. Su rol es superior o igual al mío.",
            "info",
        );
      }

      if (
          interaction.member.roles.highest.position <=
          targetUser.roles.highest.position
      ) {
        throw new CommandError(
            "USER_HIERARCHY_ERROR",
            "No puedes banear a este usuario. Su rol es superior o igual al tuyo.",
            "info",
        );
      }

      await interaction.guild.members.ban(targetUser, { reason });

      logger.info(
          `User ${targetUser.user.tag} was banned by ${interaction.user.tag}`,
          {
            guildId: interaction.guild.id,
            targetUserId: targetUser.id,
            reason: reason,
          }
      );

      const successEmbed = new CustomEmbedBuilder()
          .setTitle("Usuario Baneado")
          .setDescription(`${targetUser.user.tag} ha sido baneado del servidor.`)
          .addField("Razón", reason)
          .setColor("#FF0000")
          .build();

      const dmEmbed = new CustomEmbedBuilder()
          .setTitle("Has sido baneado")
          .setDescription(`Has sido baneado de ${interaction.guild.name}.`)
          .addField("Razón", reason)
          .setColor("#FF0000")
          .build();

      await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
        logger.warn(`Could not send DM to ${targetUser.user.tag}`);
      });

      return [
        { embeds: [successEmbed] },
        { content: "El usuario ha sido notificado por DM.", ephemeral: true },
      ];
    } catch (error) {
      logger.error("Error in ban command", error, { interaction });
      await ErrorHandler.handle(error, interaction);
    }
  },
};