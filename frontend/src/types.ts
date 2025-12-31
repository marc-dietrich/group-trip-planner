export type HealthCheck = {
  status: string;
  message: string;
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

export type Identity =
  | { kind: "actor"; actorId: string; displayName: string }
  | { kind: "user"; userId: string; displayName: string; accessToken: string };
