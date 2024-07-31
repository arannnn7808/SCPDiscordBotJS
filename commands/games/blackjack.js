const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const logger = require("../../utils/logger");

class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
    }

    toString() {
        return `${this.value}${this.suit}`;
    }
}

class Deck {
    constructor() {
        this.cards = this.createDeck();
        this.shuffle();
    }

    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        return suits.flatMap(suit => values.map(value => new Card(suit, value)));
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    drawCard() {
        if (this.cards.length === 0) {
            this.cards = this.createDeck();
            this.shuffle();
        }
        return this.cards.pop();
    }
}

class BlackjackGame {
    constructor() {
        this.deck = new Deck();
        this.playerHand = [];
        this.dealerHand = [];
        this.gameOver = false;
    }

    start() {
        this.playerHand = [this.deck.drawCard(), this.deck.drawCard()];
        this.dealerHand = [this.deck.drawCard(), this.deck.drawCard()];
    }

    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;
        for (let card of hand) {
            if (['K', 'Q', 'J'].includes(card.value)) {
                value += 10;
            } else if (card.value === 'A') {
                aces += 1;
            } else {
                value += parseInt(card.value);
            }
        }
        for (let i = 0; i < aces; i++) {
            if (value + 11 <= 21) {
                value += 11;
            } else {
                value += 1;
            }
        }
        return value;
    }

    dealerPlay() {
        while (this.calculateHandValue(this.dealerHand) < 17) {
            this.dealerHand.push(this.deck.drawCard());
        }
    }

    getGameResult() {
        const playerValue = this.calculateHandValue(this.playerHand);
        const dealerValue = this.calculateHandValue(this.dealerHand);

        if (playerValue > 21) return "Dealer Wins";
        if (dealerValue > 21) return "Player Wins";
        if (playerValue > dealerValue) return "Player Wins";
        if (dealerValue > playerValue) return "Dealer Wins";
        return "Draw";
    }

    formatHand(hand, hideSecond = false) {
        return hand.map((card, index) => hideSecond && index === 1 ? '🂠' : card.toString()).join(' ');
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blackjack")
        .setDescription("Play a game of Blackjack."),
    folder: "games",
    cooldown: 5,

    games: new Map(),

    async execute(interaction) {
        const userId = interaction.user.id;
        let game = this.games.get(userId);

        if (!game) {
            game = new BlackjackGame();
            game.start();
            this.games.set(userId, game);
        }

        const embed = this.createGameEmbed(game);
        const actionRow = this.createActionRow(game);

        await this.safeReply(interaction, { embeds: [embed], components: [actionRow] });
    },

    createGameEmbed(game) {
        const embed = new CustomEmbedBuilder()
            .setTitle("Blackjack")
            .addField("Your Hand", game.formatHand(game.playerHand))
            .addField("Your Hand Value", game.calculateHandValue(game.playerHand).toString())
            .addField("Dealer's Hand", game.formatHand(game.dealerHand, !game.gameOver))
            .setColor("#00FF00");

        if (game.gameOver) {
            embed.addField("Dealer's Hand Value", game.calculateHandValue(game.dealerHand).toString());
            embed.addField("Result", game.getGameResult());
        }

        return embed.build();
    },

    createActionRow(game) {
        const hitButton = new ButtonBuilder()
            .setCustomId('blackjack_hit')
            .setLabel('Hit')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(game.gameOver);

        const standButton = new ButtonBuilder()
            .setCustomId('blackjack_stand')
            .setLabel('Stand')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(game.gameOver);

        return new ActionRowBuilder().addComponents(hitButton, standButton);
    },

    async handleButtonInteraction(interaction) {
        const userId = interaction.user.id;
        const game = this.games.get(userId);

        if (!game) {
            return this.safeReply(interaction, { content: "No active game found. Use `/blackjack` to start a new game.", components: [] });
        }

        const action = interaction.customId.split('_')[1];

        switch (action) {
            case 'hit':
                await this.hit(game);
                break;
            case 'stand':
                await this.stand(game);
                break;
        }

        const embed = this.createGameEmbed(game);
        const actionRow = this.createActionRow(game);

        await this.safeReply(interaction, { embeds: [embed], components: [actionRow] });

        if (game.gameOver) {
            this.games.delete(userId);
        }
    },

    async safeReply(interaction, payload) {
        try {
            if (interaction.deferred) {
                await interaction.editReply(payload);
            } else if (interaction.replied) {
                await interaction.followUp(payload);
            } else {
                await interaction.reply(payload);
            }
        } catch (error) {
            logger.error(`Error in safeReply: ${error.message}`, { error });
        }
    },

    async hit(game) {
        game.playerHand.push(game.deck.drawCard());
        if (game.calculateHandValue(game.playerHand) > 21) {
            game.gameOver = true;
            game.dealerPlay();
        }
    },

    async stand(game) {
        game.dealerPlay();
        game.gameOver = true;
    }
};