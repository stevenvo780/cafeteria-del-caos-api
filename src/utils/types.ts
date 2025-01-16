export interface BotConfig {
  rewards: {
    messages: {
      amount: number;
      coins: number;
      allowedChannels: string[];
    };
    voiceTime: {
      minutes: number;
      coins: number;
    };
    forums: {
      coins: number;
      allowedForums: string[];
    };
  };
  channels: {
    rewardChannelId: string;
  };
  messages: {
    recompensa: string;
    error: string;
  };
}