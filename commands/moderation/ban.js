const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");
const ErrorHandler = require("../../utils/errorHandler");
const CustomEmbedBuilder = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
      .setName("ban")
      .setDescription("Banea a un usuario del servidor")
      .addUserOption((option) =>
          option.setName("usuario").setDescription("Usuario que deseas banear").setRequired(true)
      )
      .addStringOption((option) =>
          option.setName("razon").setDescription("Razón del ban").setRequired(true)
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
        return [{ content: "No tienes permiso para banear miembros en este servidor.", ephemeral: true }];
      }

      if (!targetUser) {
        return [{ content: "El usuario especificado no está en el servidor.", ephemeral: true }];
      }

      if (targetUser.id === interaction.guild.ownerId) {
        return [{ content: "No puedes banear al dueño del servidor.", ephemeral: true }];
      }

      if (interaction.guild.members.me.roles.highest.position <= targetUser.roles.highest.position) {
        return [{ content: "No puedo banear a este usuario. Su rol es superior o igual al mío.", ephemeral: true }];
      }

      if (interaction.member.roles.highest.position <= targetUser.roles.highest.position) {
        return [{ content: "No puedes banear a este usuario. Su rol es superior o igual al tuyo.", ephemeral: true }];
      }

      await interaction.guild.members.ban(targetUser, { reason });

      logger.info(`User ${targetUser.user.tag} was banned by ${interaction.user.tag}`, {
        guildId: interaction.guild.id,
        targetUserId: targetUser.id,
        reason: reason,
      });

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