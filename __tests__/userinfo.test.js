const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userInfoCommand = require('../commands/utility/userinfo');
const { handleCommandError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

jest.mock('discord.js');
jest.mock('../utils/errorHandler');
jest.mock('../utils/logger');

describe('UserInfo Command', () => {
    let mockInteraction;

    beforeEach(() => {
        mockInteraction = {
            options: {
                getUser: jest.fn()
            },
            guild: {
                members: {
                    fetch: jest.fn()
                }
            },
            reply: jest.fn().mockResolvedValue(),
            user: {
                tag: 'TestUser#1234',
                id: '123456789',
                createdTimestamp: 1600000000000
            }
        };
    });

    test('should display info for the command user when no user is specified', async () => {
        mockInteraction.options.getUser.mockReturnValue(null);
        const mockMember = createMockMember(mockInteraction.user);
        mockInteraction.guild.members.fetch.mockResolvedValue(mockMember);

        await userInfoCommand.execute(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            embeds: [expect.any(Object)]
        }));
    });

    test('should display info for a specified user', async () => {
        const targetUser = {
            id: '987654321',
            tag: 'TargetUser#5678',
            createdTimestamp: 1610000000000,
            bot: false
        };
        mockInteraction.options.getUser.mockReturnValue(targetUser);
        const mockMember = createMockMember(targetUser);
        mockInteraction.guild.members.fetch.mockResolvedValue(mockMember);

        await userInfoCommand.execute(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            embeds: [expect.any(Object)]
        }));
    });

    // Helper function to create mock member objects
    function createMockMember(user, isBot = false, isAdmin = false, roles = ['@role1', '@role2']) {
        return {
            user: {
                ...user,
                bot: isBot,
                displayAvatarURL: jest.fn().mockReturnValue('http://example.com/avatar.jpg')
            },
            nickname: 'NickName',
            joinedTimestamp: user.createdTimestamp + 1000000,
            roles: {
                cache: roles.map((role, index) => ({
                    position: index + 1,
                    toString: () => role,
                    name: role.replace('@', '')
                })),
                highest: { position: roles.length }
            },
            permissions: { has: (perm) => isAdmin && perm === 'ADMINISTRATOR' },
            displayHexColor: '#FF0000'
        };
    }
});