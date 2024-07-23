const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { handleCommandError } = require("../../utils/errorHandler");
const logger = require("../../utils/logger");

/**
 * Command to display information about a user.
 * @module UserInfoCommand
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Obtén información sobre un usuario.")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("El usuario del que quieres obtener información"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,

  /**
   * Executes the userinfo command.
   * @async
   * @param {import('discord.js').CommandInteraction} interaction - The interaction that triggered the command.
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const targetUser =
        interaction.options.getUser("usuario") || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id);

      if (!member) {
        throw new Error("USUARIO_NO_ENCONTRADO");
      }

      const embed = await this.createUserInfoEmbed(member, interaction);
      await interaction.editReply({ embeds: [embed] });
      logger.info("Userinfo command executed successfully", {
        user: interaction.user.tag,
      });
    } catch (error) {
      logger.error("Error executing userinfo command", error);
      await interaction.editReply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },

  /**
   * Creates an embed with user information.
   * @async
   * @param {import('discord.js').GuildMember} member - The guild member to get information about.
   * @param {import('discord.js').CommandInteraction} interaction - The interaction that triggered the command.
   * @returns {Promise<import('discord.js').EmbedBuilder>} The created embed.
   */
  async createUserInfoEmbed(member, interaction) {
    const roles = member.roles.cache
      .sort((a, b) => b.position - a.position)
      .map((role) => role.toString())
      .slice(0, -1);

    return new EmbedBuilder()
      .setTitle(`Información de Usuario: ${member.user.tag}`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setColor(member.displayHexColor || "#00FF00")
      .addFields(
        { name: "ID", value: member.user.id, inline: true },
        { name: "Apodo", value: member.nickname || "Ninguno", inline: true },
        {
          name: "Cuenta Creada",
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "Se Unió al Servidor",
          value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
          inline: true,
        },
        { name: "Roles", value: roles.length ? roles.join(", ") : "Ninguno" },
        {
          name: "Es un Bot",
          value: member.user.bot ? "Sí" : "No",
          inline: true,
        },
      )
      .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
      .setTimestamp();
  },
};
