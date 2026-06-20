import axios from '@/lib/axios';

export type CalendarFeedScope = 'PACK' | 'DEN';

export interface CalendarFeedDescriptor {
  scopeType: CalendarFeedScope;
  denId: string | null;
  displayName: string;
  feedUrl: string;
  isActive: boolean;
  lastAccessedAt: string | null;
}

export interface RegenerateFeedInput {
  scopeType: CalendarFeedScope;
  denId?: string;
}

export interface RegenerateFeedResponse {
  scopeType: CalendarFeedScope;
  denId: string | null;
  feedUrl: string;
}

class CalendarFeedService {
  async listFeeds(): Promise<CalendarFeedDescriptor[]> {
    const response = await axios.get<CalendarFeedDescriptor[]>('/me/calendar-feeds');
    return response.data;
  }

  async regenerateFeed(input: RegenerateFeedInput): Promise<RegenerateFeedResponse> {
    const response = await axios.post<RegenerateFeedResponse>('/me/calendar-feeds/regenerate', input);
    return response.data;
  }
}

export const calendarFeedService = new CalendarFeedService();
