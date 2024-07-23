const serverStatusCommand = require("../commands/api/serverstatus");
const logger = require("../utils/logger");

jest.mock("../utils/logger");

// Mock fetch globally
global.fetch = jest.fn();

describe("ServerStatus Command", () => {
  let mockInteraction;

  beforeEach(() => {
    mockInteraction = {
      deferReply: jest.fn().mockResolvedValue(),
      editReply: jest.fn().mockResolvedValue(),
      user: { tag: "TestUser#1234" },
    };

    process.env.SERVER_ID_API = "12345";
    process.env.LINK_IMAGE_SERVER = "http://example.com/server-image.png";

    // Reset the fetch mock before each test
    global.fetch.mockReset();
  });

  test("should display server status successfully", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        online: true,
        players: "10/20",
        version: "1.0.0",
        friendlyFire: true,
        ip: "127.0.0.1",
        port: "7777",
        info: "Test Server",
      }),
    });

    await serverStatusCommand.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.any(Object)],
      }),
    );
    expect(logger.info).toHaveBeenCalled();
  });

  test("should handle server offline status", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        online: false,
        players: "0/20",
        version: "1.0.0",
        friendlyFire: false,
        ip: "127.0.0.1",
        port: "7777",
        info: "Test Server",
      }),
    });

    await serverStatusCommand.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.any(Object)],
      }),
    );
  });

  test("should handle API error", async () => {
    global.fetch.mockRejectedValueOnce(new Error("API Error"));

    await serverStatusCommand.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.any(Object)],
      }),
    );
    expect(logger.error).toHaveBeenCalled();
  });
});
