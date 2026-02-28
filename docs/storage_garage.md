# Garage Object Storage (Local, S3-compatible)

This project can store profile/group images in self-hosted Garage object storage.

## 1) Start Garage

```bash
cd storage
docker compose up -d
# Optional UI (if desired)
docker compose --profile ui up -d
```

Garage endpoints:

- S3 API: `http://localhost:3900`
- Admin API: `http://localhost:3901`
- Optional UI: `http://localhost:8088`

## 2) Bootstrap key + bucket

Use Garage CLI inside the container:

```bash
cd storage

# Generate one keypair
docker compose exec garage garage key new --name app-key

# List keys and copy KEY_ID + SECRET_KEY
docker compose exec garage garage key list

# Create bucket
docker compose exec garage garage bucket create group-trip-images

# Allow key to access bucket (read+write+owner)
docker compose exec garage garage bucket allow \
  --read --write --owner group-trip-images --key <KEY_ID>
```

Then set backend env values:

```bash
STORAGE_S3_ENDPOINT=http://localhost:3900
STORAGE_S3_REGION=garage
STORAGE_S3_ACCESS_KEY=<KEY_ID>
STORAGE_S3_SECRET_KEY=<SECRET_KEY>
STORAGE_S3_BUCKET=group-trip-images
STORAGE_S3_USE_SSL=false
```

## 3) Backend image endpoints

- `POST /api/users/me/profile-image` (JWT required)
- `POST /api/groups/{group_id}/image` (group membership required)
- `GET /api/users/{user_id}/profile-image`
- `GET /api/groups/{group_id}/image`
- `GET /api/images/{asset_id}/presigned`

Validation/processing:

- MIME allowed: `image/jpeg`, `image/png`, `image/webp`
- Input max size: `IMAGE_UPLOAD_MAX_INPUT_BYTES` (default 5 MB)
- Profile output: `512x512`, <= `PROFILE_IMAGE_TARGET_BYTES` (default 100 KB)
- Group output: `1024x512`, <= `GROUP_IMAGE_TARGET_BYTES` (default 200 KB)
- Filenames: UUID-based keys

## 4) HTTPS enforcement

Backend can force HTTPS redirects using:

```bash
ENFORCE_HTTPS=true
```

In production, terminate TLS at reverse proxy (Caddy/Nginx) and route backend traffic over trusted network.

## 5) Frontend upload snippet (TypeScript)

```ts
async function uploadProfileImage(file: File, token: string) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/users/me/profile-image", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }

  return res.json();
}

async function uploadGroupImage(
  groupId: string,
  file: File,
  actorId: string,
  token?: string,
) {
  const form = new FormData();
  form.append("file", file);

  const headers: Record<string, string> = { "X-Actor-Id": actorId };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api/groups/${groupId}/image`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }

  return res.json();
}
```

## 6) Scale + backup guidance

- For larger scale, run Garage as a multi-node cluster and increase `replication_factor`.
- Keep `metadata_dir` and `data_dir` on separate durable disks where possible.
- Snapshot/backup both directories (`garage_meta`, `garage_data`) consistently.
- Versioning and lifecycle rules can be managed per bucket for retention and cleanup.
