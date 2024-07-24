const { PermissionsBitField } = require("discord.js");
const CustomEmbedBuilder = require("./embedBuilder");

class PermissionCheck {
  static async check(interaction, requiredPermissions) {
    const missingPermissions = [];

    for (const permission of requiredPermissions) {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags[permission],
        )
      ) {
        missingPermissions.push(permission);
      }
    }

    if (missingPermissions.length > 0) {
      const errorEmbed = CustomEmbedBuilder.error(
        "Permisos Insuficientes",
        `No tienes los siguientes permisos requeridos: ${missingPermissions.join(", ")}`,
      );

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return false;
    }

    return true;
  }

  static async checkRoles(interaction, requiredRoles) {
    const missingRoles = [];

    for (const roleId of requiredRoles) {
      if (!interaction.member.roles.cache.has(roleId)) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (role) missingRoles.push(role.name);
      }
    }

    if (missingRoles.length > 0) {
      const errorEmbed = CustomEmbedBuilder.error(
        "Roles Insuficientes",
        `No tienes los siguientes roles requeridos: ${missingRoles.join(", ")}`,
      );

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return false;
    }

    return true;
  }

  static global(client, requiredPermissions) {
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isCommand()) return;

      const hasPermission = await this.check(interaction, requiredPermissions);
      if (!hasPermission) {
        // Prevent command execution
        return true;
      }
    });
  }

  static async checkBotPermissions(interaction, requiredPermissions) {
    const botMember = interaction.guild.members.me;
    const missingPermissions = [];

    for (const permission of requiredPermissions) {
      if (!botMember.permissions.has(PermissionsBitField.Flags[permission])) {
        missingPermissions.push(permission);
      }
    }

    if (missingPermissions.length > 0) {
      const errorEmbed = CustomEmbedBuilder.error(
        "Permisos de Bot Insuficientes",
        `El bot no tiene los siguientes permisos requeridos: ${missingPermissions.join(", ")}`,
      );

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return false;
    }

    return true;
  }
}

module.exports = PermissionCheck;
