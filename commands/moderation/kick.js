const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const {
  createErrorEmbed,
  createSuccessEmbed,
} = require("../../utils/embedBuilder");
const { handleCommandError } = require("../../utils/errorHandler");
const logger = require("../../utils/logger");

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
  cooldown: 10,
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
      // Input validation
      const targetUser = interaction.options.getMember("usuario");
      if (!targetUser) {
        return await interaction.editReply({
          embeds: [
            createErrorEmbed(
              "Error",
              "El usuario especificado no está en el servidor.",
            ),
          ],
          ephemeral: true,
        });
      }

      if (targetUser.id === interaction.user.id) {
        return await interaction.editReply({
          embeds: [
            createErrorEmbed("Error", "No puedes expulsarte a ti mismo."),
          ],
          ephemeral: true,
        });
      }

      if (targetUser.id === interaction.client.user.id) {
        return await interaction.editReply({
          embeds: [
            createErrorEmbed("Error", "No puedo expulsarme a mí mismo."),
          ],
          ephemeral: true,
        });
      }

      if (
        targetUser.roles.highest.position >=
        interaction.member.roles.highest.position
      ) {
        return await interaction.editReply({
          embeds: [
            createErrorEmbed(
              "Error",
              "No puedes expulsar a un usuario con un rol igual o superior al tuyo.",
            ),
          ],
          ephemeral: true,
        });
      }

      const reason =
        interaction.options.getString("razon") || "No se proporcionó razón";
      if (reason.length > 512) {
        return await interaction.editReply({
          embeds: [
            createErrorEmbed(
              "Error",
              "La razón de la expulsión no puede exceder los 512 caracteres.",
            ),
          ],
          ephemeral: true,
        });
      }

      // Perform kick
      await targetUser.kick(reason);
      logger.info(
        `User ${targetUser.user.tag} was kicked by ${interaction.user.tag} for reason: ${reason}`,
      );

      const successEmbed = createSuccessEmbed(
        "Usuario Expulsado",
        `Usuario ${targetUser.user.tag} expulsado correctamente.\nRazón: ${reason}`,
      );
      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error("Error executing kick command", error);
      await interaction.editReply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
