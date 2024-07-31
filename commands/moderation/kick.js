const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");
const ErrorHandler = require("../../utils/errorHandler");
const CustomEmbedBuilder = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
      .setName("kick")
      .setDescription("Expulsa a un usuario del servidor")
      .addUserOption((option) =>
          option.setName("usuario").setDescription("Usuario que deseas expulsar").setRequired(true)
      )
      .addStringOption((option) =>
          option.setName("razon").setDescription("Razón de la expulsión").setRequired(false)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  folder: "moderation",
  permissions: ["KickMembers"],
  cooldown: 5,
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getMember("usuario");
      const reason = interaction.options.getString("razon") || "No se proporcionó razón";

      if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        return [{ content: "No tienes permiso para expulsar miembros en este servidor.", ephemeral: true }];
      }

      if (!targetUser) {
        return [{ content: "El usuario especificado no está en el servidor.", ephemeral: true }];
      }

      if (targetUser.id === interaction.user.id) {
        return [{ content: "No puedes expulsarte a ti mismo.", ephemeral: true }];
      }

      if (targetUser.id === interaction.client.user.id) {
        return [{ content: "No puedo expulsarme a mí mismo.", ephemeral: true }];
      }

      if (interaction.guild.members.me.roles.highest.position <= targetUser.roles.highest.position) {
        return [{ content: "No puedo expulsar a este usuario. Su rol es superior o igual al mío.", ephemeral: true }];
      }

      if (interaction.member.roles.highest.position <= targetUser.roles.highest.position) {
        return [{ content: "No puedes expulsar a este usuario. Su rol es superior o igual al tuyo.", ephemeral: true }];
      }

      await targetUser.kick(reason);

      logger.info(`User ${targetUser.user.tag} was kicked by ${interaction.user.tag}`, {
        reason: reason,
        guildId: interaction.guild.id,
      });

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