const { PermissionFlagsBits } = require('discord.js');
const kickCommand = require('../commands/moderation/kick');
const { checkPermission } = require('../utils/permissionCheck');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embedBuilder');
const logger = require('../utils/logger');

jest.mock('../utils/permissionCheck');
jest.mock('../utils/embedBuilder');
jest.mock('../utils/logger');

describe('Kick Command', () => {
    let mockInteraction;

    beforeEach(() => {
        mockInteraction = {
            options: {
                getMember: jest.fn(),
                getString: jest.fn()
            },
            guild: {
                members: {
                    me: {
                        permissions: {
                            has: jest.fn()
                        },
                        roles: {
                            highest: { position: 5 }
                        }
                    }
                }
            },
            member: {
                permissions: {
                    has: jest.fn()
                },
                roles: {
                    highest: { position: 3 }
                }
            },
            reply: jest.fn(),
            user: { tag: 'TestUser#1234' }
        };
        checkPermission.mockResolvedValue(true);
    });

    test('should handle lack of bot permissions', async () => {
        mockInteraction.guild.members.me.permissions.has.mockReturnValue(false);

        await kickCommand.execute(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            embeds: [expect.any(Object)],
            ephemeral: true,
        }));
        expect(logger.warn).toHaveBeenCalled();
    });

    test('should handle user not in server', async () => {
        mockInteraction.options.getMember.mockReturnValue(null);
        mockInteraction.guild.members.me.permissions.has.mockReturnValue(true);

        await kickCommand.execute(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            embeds: [expect.any(Object)],
            ephemeral: true,
        }));
    });

    test('should handle unkickable user', async () => {
        const mockTargetUser = {
            id: '123456789',
            user: { tag: 'TargetUser#5678' },
            roles: { highest: { position: 10 } },
            kickable: false,
        };
        mockInteraction.options.getMember.mockReturnValue(mockTargetUser);
        mockInteraction.guild.members.me.permissions.has.mockReturnValue(true);

        await kickCommand.execute(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            embeds: [expect.any(Object)],
            ephemeral: true,
        }));
    });
});