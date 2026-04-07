import { User } from "@/store/useAuthStore";
import { Friendship } from "@/store/useFriendStore";

export const MOCK_USER: User = {
  id: "u1",
  username: "HoangGJinn",
  email: "hoang@example.com",
  displayName: "G-Jinn (Developer)",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hoang",
  status: "ONLINE",
  role: ["ROLE_USER"],
};

export const MOCK_FRIENDS: User[] = [
  {
    id: "f1",
    username: "Alexander",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    status: "ONLINE",
    email: "alex@example.com",
    role: ["ROLE_USER"],
  },
  {
    id: "f2",
    username: "Sophia",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia",
    status: "IDLE",
    email: "sophia@example.com",
    role: ["ROLE_USER"],
  },
  {
    id: "f3",
    username: "X-Æ-A12",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elon",
    status: "DND",
    email: "elon@example.com",
    role: ["ROLE_USER"],
  },
];

export const MOCK_RECEIVED_REQUESTS: Friendship[] = [
  {
    id: "r1",
    user: MOCK_USER,
    friend: {
      id: "u4",
      username: "Stranger_Danger",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Stranger",
      email: "s@e.com",
      role: ["ROLE_USER"],
    },
    status: "PENDING",
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_SENT_REQUESTS: Friendship[] = [
  {
    id: "s1",
    user: MOCK_USER,
    friend: {
      id: "u5",
      username: "Future_Friend",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Future",
      email: "f@e.com",
      role: ["ROLE_USER"],
    },
    status: "PENDING",
    createdAt: new Date().toISOString(),
  },
];
