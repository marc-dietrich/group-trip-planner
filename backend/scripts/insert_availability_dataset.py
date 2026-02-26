#!/usr/bin/env python3
"""Insert generated availability dataset into backend via API.

Reads JSON from generate_availability_dataset.py, creates one group, joins members,
adds availability ranges, verifies invite preview, and polls summary until non-empty.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def _request_json(
    *,
    method: str,
    url: str,
    headers: dict[str, str] | None = None,
    payload: dict[str, Any] | None = None,
) -> Any:
    body: bytes | None = None
    req_headers = {"Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        req_headers.setdefault("Content-Type", "application/json")

    req = Request(url=url, method=method, headers=req_headers, data=body)
    try:
        with urlopen(req, timeout=25) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"{method} {url} failed with {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"{method} {url} failed: {exc.reason}") from exc


def _create_group(*, api_base: str, actor_id: str, display_name: str, group_name: str, origin: str) -> dict[str, Any]:
    return _request_json(
        method="POST",
        url=f"{api_base}/api/groups",
        headers={"X-Actor-Id": actor_id, "Origin": origin},
        payload={"groupName": group_name, "displayName": display_name},
    )


def _join_group(*, api_base: str, actor_id: str, group_id: str, origin: str) -> None:
    _request_json(
        method="POST",
        url=f"{api_base}/api/groups/{group_id}/join",
        headers={"X-Actor-Id": actor_id, "Origin": origin},
    )


def _add_availability(*, api_base: str, actor_id: str, group_id: str, start_date: str, end_date: str, origin: str) -> None:
    _request_json(
        method="POST",
        url=f"{api_base}/api/groups/{group_id}/availabilities",
        headers={"X-Actor-Id": actor_id, "Origin": origin},
        payload={"startDate": start_date, "endDate": end_date},
    )


def _preview_group(*, api_base: str, actor_id: str, group_id: str, origin: str) -> dict[str, Any]:
    return _request_json(
        method="GET",
        url=f"{api_base}/api/groups/{group_id}",
        headers={"X-Actor-Id": actor_id, "Origin": origin},
    )


def _summary(*, api_base: str, actor_id: str, group_id: str, origin: str) -> list[dict[str, Any]]:
    return _request_json(
        method="GET",
        url=f"{api_base}/api/groups/{group_id}/availability-summary",
        headers={"X-Actor-Id": actor_id, "Origin": origin},
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Insert generated availability dataset through API")
    parser.add_argument("--input", default="backend/scripts/demo_availability_dataset.json", help="Input JSON file")
    parser.add_argument("--api-base", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument("--frontend-base", default="http://localhost:5173", help="Frontend base URL")
    parser.add_argument("--summary-timeout", type=int, default=20, help="Seconds to wait for summary cache")
    parser.add_argument("--summary-interval", type=float, default=1.0, help="Polling interval in seconds")
    args = parser.parse_args()

    payload_path = Path(args.input)
    if not payload_path.exists():
        raise RuntimeError(f"Input dataset not found: {payload_path}")

    data = json.loads(payload_path.read_text(encoding="utf-8"))

    api_base = args.api_base.rstrip("/")
    frontend_base = args.frontend_base.rstrip("/")

    owner_actor_id = data["ownerActorId"]
    owner_display_name = data.get("ownerDisplayName") or "Demo Owner"
    group_name = data["groupName"]
    members = data["members"]
    if not members:
        raise RuntimeError("Dataset has no members")

    created = _create_group(
        api_base=api_base,
        actor_id=owner_actor_id,
        display_name=owner_display_name,
        group_name=group_name,
        origin=frontend_base,
    )
    group_id = created["groupId"]
    invite_link = created["inviteLink"]

    joined = 1
    total_ranges = 0
    for member in members:
        actor_id = member["actorId"]
        ranges = member.get("ranges", [])

        if actor_id != owner_actor_id:
            _join_group(
                api_base=api_base,
                actor_id=actor_id,
                group_id=group_id,
                origin=frontend_base,
            )
            joined += 1

        for item in ranges:
            _add_availability(
                api_base=api_base,
                actor_id=actor_id,
                group_id=group_id,
                start_date=item["startDate"],
                end_date=item["endDate"],
                origin=frontend_base,
            )
            total_ranges += 1

    preview = _preview_group(
        api_base=api_base,
        actor_id=owner_actor_id,
        group_id=group_id,
        origin=frontend_base,
    )

    deadline = time.time() + max(1, args.summary_timeout)
    summary_rows: list[dict[str, Any]] = []
    while time.time() < deadline:
        summary_rows = _summary(
            api_base=api_base,
            actor_id=owner_actor_id,
            group_id=group_id,
            origin=frontend_base,
        )
        if summary_rows:
            break
        time.sleep(max(0.1, args.summary_interval))

    print(f"✓ {group_name}")
    print(f"  groupId:      {group_id}")
    print(f"  members:      {joined}")
    print(f"  ranges added: {total_ranges}")
    print(f"  inviteLink:   {invite_link}")
    print(f"  previewName:  {preview.get('name')}")
    print(f"  expiresAt:    {preview.get('inviteExpiresAt')}")
    print(f"  summaryRows:  {len(summary_rows)}")
    print()
    print("Share-ready invite link:")
    print(invite_link)

    if not summary_rows:
        print("\nWarning: Summary is still empty after timeout; cache update may still be running.")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1)
