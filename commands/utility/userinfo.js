const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const ErrorHandler = require("../../utils/errorHandler");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
      .setName("userinfo")
      .setDescription("Obtén información sobre un usuario.")
      .addUserOption((option) =>
          option.setName("usuario").setDescription("El usuario del que quieres obtener información")
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
  folder: "utility",
  permissions: ["SendMessages"],
  cooldown: 5,

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser("usuario") || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id);

      if (!member) {
        throw new Error("El usuario especificado no está en el servidor.");
      }

      const embed = this.createUserInfoEmbed(member, interaction);
      logger.info(`Userinfo command executed for ${targetUser.tag}`, {
        executor: interaction.user.tag,
        guildId: interaction.guild.id,
      });

      return [{ embeds: [embed] }];
    } catch (error) {
      logger.error("Error in userinfo command", error, { interaction });
      await ErrorHandler.handle(error, interaction);
    }
  },

  createUserInfoEmbed(member, interaction) {
    const roles = member.roles.cache
        .sort((a, b) => b.position - a.position)
        .map((role) => role.toString())
        .slice(0, -1);

    return new CustomEmbedBuilder()
        .setTitle(`Información de Usuario: ${member.user.tag}`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setColor(member.displayHexColor || "#00FF00")
        .addField("ID", member.user.id, true)
        .addField("Apodo", member.nickname || "Ninguno", true)
        .addField(
            "Cuenta Creada",
            `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
            true
        )
        .addField(
            "Se Unió al Servidor",
            `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
            true
        )
        .addField("Roles", roles.length ? roles.join(", ") : "Ninguno")
        .addField("Es un Bot", member.user.bot ? "Sí" : "No", true)
        .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
        .setTimestamp()
        .build();
  },
};