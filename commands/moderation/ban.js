const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const {
  createSuccessEmbed,
  createErrorEmbed,
} = require("../../utils/embedBuilder");
const logger = require("../../utils/logger");

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
  cooldown: 10,
  async execute(interaction) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      const targetUser = interaction.options.getMember("usuario");
      const reason = interaction.options.getString("razon");

      // Check if the bot has permission to ban members
      if (
        !interaction.guild.members.me.permissions.has(
          PermissionFlagsBits.BanMembers,
        )
      ) {
        const errorEmbed = createErrorEmbed(
          "Error de Permisos",
          "No tengo permiso para banear miembros en este servidor.",
        );
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Check if the user has permission to ban members
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        const errorEmbed = createErrorEmbed(
          "Error de Permisos",
          "No tienes permiso para banear miembros en este servidor.",
        );
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Check if the target user exists
      if (!targetUser) {
        const errorEmbed = createErrorEmbed(
          "Error",
          "El usuario especificado no está en el servidor.",
        );
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Check if the target user is the server owner
      if (targetUser.id === interaction.guild.ownerId) {
        const errorEmbed = createErrorEmbed(
          "Error",
          "No puedes banear al dueño del servidor.",
        );
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Check if the bot's highest role is higher than the target user's highest role
      if (
        interaction.guild.members.me.roles.highest.position <=
        targetUser.roles.highest.position
      ) {
        const errorEmbed = createErrorEmbed(
          "Error",
          "No puedo banear a este usuario. Mi rol más alto no es superior al suyo.",
        );
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Check if the command user is the server owner or has a higher role than the target
      if (
        interaction.member.id !== interaction.guild.ownerId &&
        interaction.member.roles.highest.position <=
          targetUser.roles.highest.position
      ) {
        const errorEmbed = createErrorEmbed(
          "Error",
          "No puedes banear a este usuario. Tu rol más alto no es superior al suyo.",
        );
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Attempt to ban the user
      await interaction.guild.members.ban(targetUser, { reason });
      logger.info(
        `User ${targetUser.user.tag} was banned by ${interaction.user.tag} for reason: ${reason}`,
      );
      const successEmbed = createSuccessEmbed(
        "Usuario Baneado",
        `Usuario ${targetUser.user.tag} baneado correctamente por: ${reason}`,
      );
      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error("Error executing ban command", error, {
        command: "ban",
        user: interaction.user.tag,
        target: interaction.options.getUser("usuario").tag,
        guild: interaction.guild.name,
      });
      const errorEmbed = createErrorEmbed(
        "Error",
        "Hubo un error al ejecutar el comando. Por favor, inténtalo de nuevo más tarde.",
      );
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    }
  },
};
