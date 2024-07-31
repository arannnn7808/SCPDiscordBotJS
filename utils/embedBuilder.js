const { EmbedBuilder } = require("discord.js");

class CustomEmbedBuilder {
  constructor(options = {}) {
    this.embed = new EmbedBuilder();
    this.setDefaults(options);
  }

  setDefaults({ color = "#0099ff", footer = { text: "Bot de Ayuda" }, timestamp = true }) {
    this.setColor(color).setFooter(footer);
    if (timestamp) this.setTimestamp();
    return this;
  }

  setTitle(title) {
    if (title) this.embed.setTitle(title);
    return this;
  }

  setDescription(description) {
    if (description) {
      this.embed.setDescription(String(description).slice(0, 4096));
    }
    return this;
  }

  addField(name, value, inline = false) {
    if (name && value) {
      this.embed.addFields({ name: String(name), value: String(value), inline });
    }
    return this;
  }

  setThumbnail(url) {
    if (url) this.embed.setThumbnail(url);
    return this;
  }

  setImage(url) {
    if (url) this.embed.setImage(url);
    return this;
  }

  setAuthor(options) {
    if (options) this.embed.setAuthor(options);
    return this;
  }

  setFooter(options) {
    if (options) {
      this.embed.setFooter(typeof options === "string" ? { text: options } : options);
    }
    return this;
  }

  setTimestamp(timestamp = Date.now()) {
    this.embed.setTimestamp(timestamp);
    return this;
  }

  setColor(color) {
    if (color) this.embed.setColor(color);
    return this;
  }

  setURL(url) {
    if (url) this.embed.setURL(url);
    return this;
  }

  build() {
    return this.embed;
  }

  static quick(title, description, color = "#0099ff") {
    return new CustomEmbedBuilder({ color }).setTitle(title).setDescription(description).build();
  }

  static error(title, description) {
    return this.quick(title, description, "#ff0000");
  }

  static success(title, description) {
    return this.quick(title, description, "#00ff00");
  }

  static warning(title, description) {
    return this.quick(title, description, "#ffff00");
  }

  static info(title, description) {
    return this.quick(title, description, "#0099ff");
  }
}

module.exports = CustomEmbedBuilder;