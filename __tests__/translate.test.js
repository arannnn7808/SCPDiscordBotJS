const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const translateCommand = require("../commands/api/translate");
const logger = require("../utils/logger");

jest.mock("@vitalets/google-translate-api", () => ({
  translate: jest.fn(),
}));
jest.mock("franc", () => ({
  franc: jest.fn(),
}));
jest.mock("../utils/logger");

describe("Translate Command", () => {
  let mockInteraction;

  beforeEach(() => {
    mockInteraction = {
      options: {
        getString: jest.fn(),
      },
      deferReply: jest.fn(),
      editReply: jest.fn(),
      user: { tag: "TestUser#1234" },
    };
  });

  test("should translate text successfully", async () => {
    const translateMock = require("@vitalets/google-translate-api").translate;
    translateMock.mockResolvedValue({
      text: "Hola mundo",
      from: { language: { iso: "en" } },
    });

    const francMock = require("franc").franc;
    francMock.mockReturnValue("eng");

    mockInteraction.options.getString
      .mockReturnValueOnce("Hello world")
      .mockReturnValueOnce("es");

    await translateCommand.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.any(Object)],
      }),
    );
    expect(logger.info).toHaveBeenCalled();
  });

  test("should handle translation error", async () => {
    const translateMock = require("@vitalets/google-translate-api").translate;
    translateMock.mockRejectedValue(new Error("Translation error"));

    mockInteraction.options.getString
      .mockReturnValueOnce("Hello world")
      .mockReturnValueOnce("es");

    await translateCommand.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.any(Object)],
      }),
    );
    expect(logger.error).toHaveBeenCalled();
  });

  test("should handle unknown source language", async () => {
    const translateMock = require("@vitalets/google-translate-api").translate;
    translateMock.mockResolvedValue({
      text: "Translated text",
      from: { language: { iso: "und" } },
    });

    const francMock = require("franc").franc;
    francMock.mockReturnValue("und");

    mockInteraction.options.getString
      .mockReturnValueOnce("Unknown language text")
      .mockReturnValueOnce("es");

    await translateCommand.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.any(Object)],
      }),
    );
  });
});
