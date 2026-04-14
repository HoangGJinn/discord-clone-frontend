import apiClient from '@/api/client';

export interface ServerResponse {
  id: number;
  name: string;
  description: string | null;
  iconUrl: string | null;
  inviteCode?: string;
  ownerId: number;
  ownerName?: string;
  memberCount: number;
  channelCount: number;
  unreadCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ServerMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface ServerMemberResponse {
  id: number;
  userId: number;
  userName: string;
  displayName: string;
  nickname: string | null;
  avatarUrl?: string | null;
  status?: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE' | null;
  role: ServerMemberRole;
  joinedAt: string;
}

export interface CategoryResponse {
  id: number;
  name: string;
  position: number;
  serverId: number;
  channels: ChannelResponse[];
  createdAt?: string;
}

export interface ChannelResponse {
  id: number;
  name: string;
  type: 'TEXT' | 'VOICE';
  topic: string | null;
  position: number;
  serverId: number;
  categoryId: number | null;
  bitrate?: number;
  userLimit?: number;
  createdAt?: string;
}

export interface ServerDetailsResponse extends ServerResponse {
  categories: CategoryResponse[];
  channels: ChannelResponse[];
  members?: ServerMemberResponse[];
}

export interface MemberSearchResult {
  id: number;
  userId: number;
  userName: string;
  displayName: string;
  nickname: string | null;
  role: ServerMemberRole;
  serverId: number;
  serverName: string;
}

export interface CreateServerInput {
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface UpdateServerInput {
  name?: string;
  description?: string;
  iconUrl?: string;
}

export interface CreateCategoryInput {
  name: string;
  position?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  position?: number;
}

export interface CreateChannelInput {
  name: string;
  type: 'TEXT' | 'VOICE';
  topic?: string;
  categoryId?: number | null;
  position?: number;
  bitrate?: number;
  userLimit?: number;
}

export interface UpdateChannelInput {
  name?: string;
  topic?: string;
  categoryId?: number | null;
  position?: number;
  bitrate?: number;
  userLimit?: number;
}

interface CreateServerRequest {
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface UploadFileInput {
  uri: string;
  mimeType?: string;
  fileName?: string;
}

export const getMyServers = async (): Promise<ServerResponse[]> => {
  const response = await apiClient.get<ServerResponse[]>('/servers/my-servers');
  return response.data;
};

export const getServerDetails = async (
  serverId: number,
): Promise<ServerDetailsResponse> => {
  const response = await apiClient.get<ServerDetailsResponse>(`/servers/${serverId}/details`);
  return response.data;
};

export const getChannelsByServer = async (
  serverId: number,
): Promise<ChannelResponse[]> => {
  const response = await apiClient.get<ChannelResponse[]>(
    `/servers/${serverId}/channels`,
  );
  return response.data;
};

export const getCategoriesByServer = async (
  serverId: number,
): Promise<CategoryResponse[]> => {
  const response = await apiClient.get<CategoryResponse[]>(
    `/servers/${serverId}/categories`,
  );
  return response.data;
};

export const getServerMembers = async (
  serverId: number,
): Promise<ServerMemberResponse[]> => {
  const response = await apiClient.get<ServerMemberResponse[]>(
    `/servers/${serverId}/members`,
  );
  return response.data;
};

export const searchMembersInServer = async (
  serverId: number,
  keyword: string,
): Promise<MemberSearchResult[]> => {
  const response = await apiClient.get<MemberSearchResult[]>('/search/members', {
    params: { serverId, keyword },
  });
  return response.data;
};

export const getChannelById = async (channelId: number): Promise<ChannelResponse> => {
  const response = await apiClient.get<ChannelResponse>(`/channels/${channelId}`);
  return response.data;
};

export const createCategory = async (
  serverId: number,
  input: CreateCategoryInput,
): Promise<CategoryResponse> => {
  const payload = {
    ...input,
    serverId,
  };

  const response = await apiClient.post<CategoryResponse>(
    `/servers/${serverId}/categories`,
    payload,
  );
  return response.data;
};

export const updateCategory = async (
  categoryId: number,
  input: UpdateCategoryInput,
): Promise<CategoryResponse> => {
  const response = await apiClient.put<CategoryResponse>(`/categories/${categoryId}`, input);
  return response.data;
};

export const deleteCategory = async (categoryId: number): Promise<void> => {
  await apiClient.delete(`/categories/${categoryId}`);
};

export const createChannel = async (
  serverId: number,
  input: CreateChannelInput,
): Promise<ChannelResponse> => {
  const payload = {
    ...input,
    serverId,
  };

  const response = await apiClient.post<ChannelResponse>(
    `/servers/${serverId}/channels`,
    payload,
  );
  return response.data;
};

export const updateChannel = async (
  channelId: number,
  input: UpdateChannelInput,
): Promise<ChannelResponse> => {
  const response = await apiClient.put<ChannelResponse>(`/channels/${channelId}`, input);
  return response.data;
};

export const deleteChannel = async (channelId: number): Promise<void> => {
  await apiClient.delete(`/channels/${channelId}`);
};

export const createServer = async (
  input: CreateServerInput,
): Promise<ServerResponse> => {
  // Current backend contract only accepts name/description/iconUrl.
  const payload: CreateServerRequest = {
    name: input.name,
    description: input.description,
    iconUrl: input.iconUrl,
  };

  const response = await apiClient.post<ServerResponse>('/servers', payload);
  return response.data;
};

export const updateServer = async (
  serverId: number,
  input: UpdateServerInput,
): Promise<ServerResponse> => {
  const response = await apiClient.put<ServerResponse>(`/servers/${serverId}`, input);
  return response.data;
};

export const deleteServer = async (serverId: number): Promise<void> => {
  await apiClient.delete(`/servers/${serverId}`);
};

export const leaveServer = async (serverId: number): Promise<void> => {
  await apiClient.post(`/servers/${serverId}/leave`);
};

export const uploadFile = async (input: UploadFileInput): Promise<string> => {
  const formData = new FormData();
  formData.append(
    'file',
    {
      uri: input.uri,
      type: input.mimeType || 'image/jpeg',
      name: input.fileName || 'upload.jpg',
    } as any,
  );

  const response = await apiClient.post<{ url?: string } | string>(
    '/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );

  const data = response.data;
  if (typeof data === 'string') {
    return data;
  }
  if (data?.url) {
    return data.url;
  }
  throw new Error('Upload response did not contain a file URL.');
};

