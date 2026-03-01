import { apiPath } from "../lib/api";
import { buildIdentityHeaders } from "../lib/identity";
import { Identity } from "../types";

export type ImageAssetDto = {
  assetId: string;
  ownerType: "user_profile" | "group_image";
  ownerUserId: string | null;
  ownerGroupId: string | null;
  bucket: string;
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  uploadedAt: string;
};

async function readErrorMessage(res: Response): Promise<string> {
  const status = res.status;
  let detail: string | null = null;
  try {
    const data = (await res.json()) as { detail?: string };
    if (typeof data?.detail === "string") {
      detail = data.detail;
    }
  } catch {
    detail = null;
  }

  if (status === 403 && detail === "Not a group member") {
    return "Nur Gruppenmitglieder können das Gruppenbild ändern";
  }
  if (status === 401) return "Bitte zuerst einloggen";
  if (status === 403) return "Keine Berechtigung für diesen Upload";
  if (status === 503) return "Bildspeicher aktuell nicht erreichbar";
  if (status === 413) return "Datei ist zu groß";
  if (status === 422) return detail ?? "Ungültiges Bildformat";
  if (detail) return detail;
  return `Upload fehlgeschlagen (${status})`;
}

async function uploadImage(
  url: string,
  file: File,
  identity: Identity,
): Promise<ImageAssetDto> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(apiPath(url), {
    method: "POST",
    headers: buildIdentityHeaders(identity),
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as ImageAssetDto;
}

export async function uploadProfileImage(
  file: File,
  identity: Identity,
): Promise<ImageAssetDto> {
  return uploadImage("/api/users/me/profile-image", file, identity);
}

export async function uploadGroupImage(
  groupId: string,
  file: File,
  identity: Identity,
): Promise<ImageAssetDto> {
  return uploadImage(`/api/groups/${groupId}/image`, file, identity);
}

export async function deleteGroupImage(
  groupId: string,
  identity: Identity,
): Promise<void> {
  const res = await fetch(apiPath(`/api/groups/${groupId}/image`), {
    method: "DELETE",
    headers: buildIdentityHeaders(identity),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
}

export function profileImageUrl(userId: string, version?: number): string {
  const suffix = version ? `?v=${version}` : "";
  return apiPath(`/api/users/${userId}/profile-image${suffix}`);
}

export function groupImageUrl(groupId: string, version?: number): string {
  const suffix = version ? `?v=${version}` : "";
  return apiPath(`/api/groups/${groupId}/image${suffix}`);
}
