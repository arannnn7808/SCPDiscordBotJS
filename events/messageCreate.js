const { Events } = require('discord.js');
const database = require('../data/database');
const logger = require('../utils/logger');

const XP_COOLDOWN = 3000; // 3 seconds in milliseconds
const xpCooldowns = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        const now = Date.now();
        const cooldownAmount = XP_COOLDOWN;
        const lastMessage = xpCooldowns.get(message.author.id) || 0;

        if (now - lastMessage < cooldownAmount) return;

        xpCooldowns.set(message.author.id, now);

        try {
            const xpToAdd = Math.floor(Math.random() * 20) + 1; // Random XP between 1-20
            await database.addXP(message.guild.id, message.author.id, xpToAdd);
        } catch (error) {
            logger.error('Error adding XP:', error);
        }
    },
};