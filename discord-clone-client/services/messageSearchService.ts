import apiClient from '@/api/client';

export interface MessageSearchResult {
  id: string;
  content: string;
  senderName: string;
  senderAvatar?: string;
  senderAvatarEffectId?: string;
  createdAt: string;
  conversationId?: string;
  channelId?: number;
}

export async function searchDmMessages(
  conversationId: string,
  keyword: string,
  page = 0,
  size = 50,
): Promise<MessageSearchResult[]> {
  const res = await apiClient.get('/search/dm-messages', {
    params: { conversationId, keyword, page, size },
  });
  return res.data;
}

export async function searchChannelMessages(
  channelId: string | number,
  keyword: string,
  page = 0,
  size = 50,
): Promise<MessageSearchResult[]> {
  const res = await apiClient.get('/search/channel-messages', {
    params: { channelId, keyword, page, size },
  });
  return res.data;
}
