const { EmbedBuilder } = require('discord.js');
const { DEFAULT_COLOR, ERROR_COLOR, SUCCESS_COLOR } = require('../config/constants');

function createBasicEmbed(title, description, options = {}) {
    const embed = new EmbedBuilder()
        .setColor(options.color || DEFAULT_COLOR)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

    if (options.fields) {
        embed.addFields(options.fields);
    }

    if (options.footer) {
        embed.setFooter(options.footer);
    }

    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }

    if (options.image) {
        embed.setImage(options.image);
    }

    return embed;
}

function createErrorEmbed(title, description, options = {}) {
    return createBasicEmbed(title, description, { ...options, color: ERROR_COLOR });
}

function createSuccessEmbed(title, description, options = {}) {
    return createBasicEmbed(title, description, { ...options, color: SUCCESS_COLOR });
}

module.exports = {
    createBasicEmbed,
    createErrorEmbed,
    createSuccessEmbed
};