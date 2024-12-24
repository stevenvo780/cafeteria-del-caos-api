import {
  Client,
  GatewayIntentBits,
  GuildScheduledEventPrivacyLevel,
} from 'discord.js';
import axios from 'axios';
import TurndownService from 'turndown';
import { CreateEventsDto } from 'src/events/dto/create-events.dto';

const turndownService = new TurndownService();
let discordClient: Client | null = null;

async function initializeClient(): Promise<Client> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents],
    rest: {
      timeout: 15000,
      retries: 3,
    },
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);
  return client;
}

async function getDiscordClient(): Promise<Client> {
  if (!discordClient) {
    discordClient = await initializeClient();
  }
  return discordClient;
}

export async function destroyDiscordClient(): Promise<void> {
  if (discordClient) {
    await discordClient.destroy();
    discordClient = null;
  }
}

export async function createDiscordEvent(
  guildId: string,
  createEventDto: CreateEventsDto,
): Promise<void> {
  try {
    const client = await getDiscordClient();

    if (!guildId?.match(/^\d+$/)) {
      throw new Error('Invalid guild ID format');
    }

    const now = new Date();
    const startDate = new Date(createEventDto.startDate);
    const endDate = new Date(createEventDto.endDate);

    if (startDate < now) {
      throw new Error('Cannot schedule event in the past.');
    }

    if (endDate <= startDate) {
      throw new Error('End date must be after the start date.');
    }

    const guild = await client.guilds.fetch(guildId);

    const markdownDescription = turndownService.turndown(
      createEventDto.description,
    );

    await guild.scheduledEvents.create({
      name: createEventDto.title,
      scheduledStartTime: startDate,
      scheduledEndTime: endDate,
      description: markdownDescription,
      entityType: 3,
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityMetadata: {
        location: 'Cafeteria del Caos',
      },
    });

    console.log('Event created in Discord successfully.');
  } catch (error) {
    await destroyDiscordClient();
    if (error instanceof Error) {
      console.error('Error creating event in Discord:', error);
      throw new Error(`Failed to create Discord event: ${error.message}`);
    } else {
      console.error('Unknown error creating event in Discord:', error);
      throw new Error(
        'Failed to create Discord event due to an unknown error.',
      );
    }
  }
}

export async function getChannelInfo(channelId: string) {
  try {
    const client = await getDiscordClient();
    const channel = await client.channels.fetch(channelId);
    return channel;
  } catch (error) {
    console.error('Error fetching channel info:', error);
    return null;
  }
}

export async function getGuildMemberCount(guildId: string): Promise<number> {
  try {
    const client = await getDiscordClient();
    const guild = await client.guilds.fetch(guildId);
    return guild.memberCount;
  } catch (error) {
    await destroyDiscordClient();
    console.error('Error fetching guild member count:', error);
    throw error;
  }
}

export async function getOnlineMemberCount(guildId: string): Promise<number> {
  const url = `https://discord.com/api/guilds/${guildId}/widget.json`;

  try {
    const response = await axios.get(url);
    return response.data.presence_count;
  } catch (error) {
    console.error('Error fetching online member count:', error);
    throw error;
  }
}
