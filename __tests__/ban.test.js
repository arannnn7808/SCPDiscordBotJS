const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const banCommand = require('../commands/moderation/ban');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embedBuilder');
const logger = require('../utils/logger');

jest.mock('discord.js', () => ({
    SlashCommandBuilder: jest.fn().mockReturnValue({
        setName: jest.fn().mockReturnThis(),
        setDescription: jest.fn().mockReturnThis(),
        addUserOption: jest.fn().mockReturnThis(),
        addStringOption: jest.fn().mockReturnThis(),
        setDefaultMemberPermissions: jest.fn().mockReturnThis(),
    }),
    PermissionFlagsBits: {
        BanMembers: 'BAN_MEMBERS',
        KickMembers: 'KICK_MEMBERS',
        Administrator: 'ADMINISTRATOR',
        ManageMessages: 'MANAGE_MESSAGES',
    },
}));
jest.mock('../utils/embedBuilder');
jest.mock('../utils/logger');

describe('Ban Command', () => {
    let mockInteraction;

    beforeEach(() => {
        mockInteraction = {
            options: {
                getMember: jest.fn(),
                getString: jest.fn(),
            },
            guild: {
                members: {
                    ban: jest.fn(),
                    me: {
                        permissions: {
                            has: jest.fn(),
                        },
                    },
                },
            },
            member: {
                permissions: {
                    has: jest.fn(),
                },
                roles: {
                    highest: { position: 5 },
                },
            },
            reply: jest.fn(),
            user: { tag: 'TestUser#1234' },
        };

        createErrorEmbed.mockReturnValue({ /* mock embed */ });
        createSuccessEmbed.mockReturnValue({ /* mock embed */ });
    });

    test('should ban user successfully', async () => {
        const mockTargetUser = {
            id: '123456789',
            user: { tag: 'TargetUser#5678' },
            roles: { highest: { position: 1 } },
            bannable: true,
        };
        mockInteraction.options.getMember.mockReturnValue(mockTargetUser);
        mockInteraction.options.getString.mockReturnValue('Test reason');
        mockInteraction.guild.members.me.permissions.has.mockReturnValue(true);
        mockInteraction.member.permissions.has.mockReturnValue(true);

        await banCommand.execute(mockInteraction);

        expect(mockInteraction.guild.members.ban).toHaveBeenCalledWith(mockTargetUser, { reason: 'Test reason' });
        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            embeds: [expect.any(Object)],
            ephemeral: true
        }));
        expect(logger.info).toHaveBeenCalled();
    });

    test('should handle lack of permissions', async () => {
        mockInteraction.guild.members.me.permissions.has.mockReturnValue(false);

        await banCommand.execute(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            embeds: [expect.any(Object)],
            ephemeral: true
        }));
    });

    test('should handle user not in server', async () => {
        mockInteraction.options.getMember.mockReturnValue(null);
        mockInteraction.guild.members.me.permissions.has.mockReturnValue(true);
        mockInteraction.member.permissions.has.mockReturnValue(true);

        await banCommand.execute(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            embeds: [expect.any(Object)],
            ephemeral: true
        }));
    });

    test('should handle unbannable user', async () => {
        const mockTargetUser = {
            id: '123456789',
            user: { tag: 'TargetUser#5678' },
            roles: { highest: { position: 10 } },
            bannable: false,
        };
        mockInteraction.options.getMember.mockReturnValue(mockTargetUser);
        mockInteraction.guild.members.me.permissions.has.mockReturnValue(true);
        mockInteraction.member.permissions.has.mockReturnValue(true);

        await banCommand.execute(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            embeds: [expect.any(Object)],
            ephemeral: true
        }));
    });
});