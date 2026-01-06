export type HealthCheck = {
  status: string;
  message: string;
};

export type Actor = {
  actorId: string;
  displayName: string;
  userId?: string | null;
};

export type Group = {
  groupId: string;
  name: string;
  inviteLink: string;
  role?: string;
};

export type GroupCreateResult = {
  groupId: string;
  name: string;
  inviteLink: string;
  role: string;
  displayName: string;
};

export type GroupMembership = {
  groupId: string;
  name: string;
  role: string;
  inviteLink: string;
};

export type GroupInvitePreview = {
  groupId: string;
  name: string;
};

export type JoinGroupResponse = {
  groupId: string;
  name: string;
  role: string;
  inviteLink: string;
  alreadyMember: boolean;
};

export type Identity =
  | { kind: "actor"; actorId: string; displayName: string }
  | { kind: "user"; actorId: string; userId: string; displayName: string; accessToken: string };

export type AvailabilityEntry = {
  id: string;
  groupId: string;
  startDate: string;
  endDate: string;
  actorId?: string;
  userId?: string | null;
  displayName?: string;
};

export type MemberAvailability = {
  memberId: string;
  actorId: string;
  userId: string | null;
  displayName: string;
  role: string;
  availabilities: AvailabilityEntry[];
};

export type GroupAvailabilityInterval = {
  from: string;
  to: string;
  availableCount: number;
  totalMembers: number;
};
