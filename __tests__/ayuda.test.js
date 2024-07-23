const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const ayudaCommand = require("../commands/utility/ayuda");
const { createBasicEmbed } = require("../utils/embedBuilder");
const { handleCommandError } = require("../utils/errorHandler");
const logger = require("../utils/logger");

jest.mock("../utils/embedBuilder");
jest.mock("../utils/errorHandler");
jest.mock("../utils/logger");

beforeEach(() => {
  mockInteraction = {
    client: {
      commands: new Map(),
    },
    reply: jest.fn().mockResolvedValue(),
    user: { tag: "TestUser#1234" },
  };

  createBasicEmbed.mockReturnValue({
    addFields: jest.fn().mockReturnThis(),
    setFooter: jest.fn().mockReturnThis(),
    setThumbnail: jest.fn().mockReturnThis(),
  });
});

test("should display help information", async () => {
  mockInteraction.client.commands.set("test1", {
    data: { name: "test1", description: "Test command 1" },
    folder: "utility",
  });
  mockInteraction.client.commands.set("test2", {
    data: { name: "test2", description: "Test command 2" },
    folder: "moderation",
  });

  await ayudaCommand.execute(mockInteraction);

  expect(createBasicEmbed).toHaveBeenCalledWith(
    "Comandos de Ayuda",
    expect.any(String),
  );
  expect(mockInteraction.reply).toHaveBeenCalledWith(
    expect.objectContaining({
      embeds: [expect.any(Object)],
    }),
  );
  expect(logger.info).toHaveBeenCalled();
});

test("should not include ayuda command in the list", async () => {
  mockInteraction.client.commands.set("ayuda", {
    data: { name: "ayuda", description: "Help command" },
    folder: "utility",
  });
  mockInteraction.client.commands.set("test", {
    data: { name: "test", description: "Test command" },
    folder: "utility",
  });

  await ayudaCommand.execute(mockInteraction);

  const embedAddFieldsMock = createBasicEmbed().addFields;
  expect(embedAddFieldsMock).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Utility",
      value: expect.not.stringContaining("ayuda"),
    }),
  );
});
