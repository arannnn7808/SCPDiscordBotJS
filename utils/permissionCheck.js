const { PermissionsBitField } = require("discord.js");
const CustomEmbedBuilder = require("./embedBuilder");

class PermissionCheck {
  static async check(interaction, requiredPermissions) {
    const missingPermissions = requiredPermissions.filter(permission =>
        !interaction.member.permissions.has(PermissionsBitField.Flags[permission])
    );

    if (missingPermissions.length > 0) {
      const errorEmbed = CustomEmbedBuilder.error(
          "Permisos Insuficientes",
          `No tienes los siguientes permisos requeridos: ${missingPermissions.join(", ")}`
      );
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return false;
    }
    return true;
  }

  static async checkRoles(interaction, requiredRoles) {
    const missingRoles = requiredRoles.filter(roleId => !interaction.member.roles.cache.has(roleId))
        .map(roleId => interaction.guild.roles.cache.get(roleId)?.name)
        .filter(Boolean);

    if (missingRoles.length > 0) {
      const errorEmbed = CustomEmbedBuilder.error(
          "Roles Insuficientes",
          `No tienes los siguientes roles requeridos: ${missingRoles.join(", ")}`
      );
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return false;
    }
    return true;
  }

  static global(client, requiredPermissions) {
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isCommand()) return;
      return await this.check(interaction, requiredPermissions);
    });
  }

  static async checkBotPermissions(interaction, requiredPermissions) {
    const botMember = interaction.guild.members.me;
    const missingPermissions = requiredPermissions.filter(permission =>
        !botMember.permissions.has(PermissionsBitField.Flags[permission])
    );

    if (missingPermissions.length > 0) {
      const errorEmbed = CustomEmbedBuilder.error(
          "Permisos de Bot Insuficientes",
          `El bot no tiene los siguientes permisos requeridos: ${missingPermissions.join(", ")}`
      );
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return false;
    }
    return true;
  }
}

module.exports = PermissionCheck;