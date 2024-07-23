const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const sayCommand = require("../commands/utility/say");
const {
  createErrorEmbed,
  createSuccessEmbed,
} = require("../utils/embedBuilder");
const logger = require("../utils/logger");

jest.mock("discord.js");
jest.mock("../utils/embedBuilder");
jest.mock("../utils/logger");

describe("Say Command", () => {
  let mockInteraction;

  beforeEach(() => {
    mockInteraction = {
      options: {
        getString: jest.fn(),
      },
      member: {
        permissions: {
          has: jest.fn(),
        },
      },
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
      channel: {
        send: jest.fn().mockResolvedValue({
          createMessageComponentCollector: jest.fn().mockReturnValue({
            on: jest.fn(),
          }),
        }),
      },
      user: {
        tag: "TestUser#1234",
      },
    };

    createErrorEmbed.mockReturnValue({
      /* mock embed */
    });
    createSuccessEmbed.mockReturnValue({
      /* mock embed */
    });
  });

  test("should execute successfully with valid permissions and message", async () => {
    mockInteraction.member.permissions.has.mockReturnValue(true);
    mockInteraction.options.getString.mockReturnValue("Test message");

    await sayCommand.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalledWith({
      ephemeral: true,
    });
    expect(mockInteraction.channel.send).toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });

  test("should handle empty message after sanitization", async () => {
    mockInteraction.member.permissions.has.mockReturnValue(true);
    mockInteraction.options.getString.mockReturnValue("@everyone");

    await sayCommand.execute(mockInteraction);

    expect(mockInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.any(Object)],
        ephemeral: true,
      }),
    );
  });
});
