import { PointsCommandData } from './services/points/types';
import { CoinsCommandData } from './services/coins/types';
import { ExperienceCommandData } from './services/experience/types';
import { NotesCommandData } from './services/notes/types';
import { InfractionCommandData } from './services/infraction/types';

export enum CommandCategories {
  POINTS = 'points',
  COINS = 'coins',
  EXPERIENCE = 'experience',
  NOTES = 'notes',
  INFRACTION = 'infraction',
}

export const DISCORD_COMMANDS = {
  [CommandCategories.POINTS]: PointsCommandData,
  [CommandCategories.COINS]: CoinsCommandData,
  [CommandCategories.EXPERIENCE]: ExperienceCommandData,
  [CommandCategories.NOTES]: NotesCommandData,
  [CommandCategories.INFRACTION]: InfractionCommandData,
} as const;

export const buildCommandsList = async () => {
  const commands = [];

  for (const config of Object.values(DISCORD_COMMANDS)) {
    for (const commandData of Object.values(config)) {
      const options =
        typeof commandData.options === 'function'
          ? await commandData.options()
          : commandData.options || [];

      commands.push({
        name: commandData.command,
        description: commandData.description,
        options,
      });
    }
  }

  return commands;
};

export const getCommandCategory = (
  commandName: string,
): CommandCategories | null => {
  for (const [category, config] of Object.entries(DISCORD_COMMANDS)) {
    if (Object.values(config).some((cmd) => cmd.command === commandName)) {
      return category as CommandCategories;
    }
  }
  return null;
};
