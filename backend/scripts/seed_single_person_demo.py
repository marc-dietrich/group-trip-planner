#!/usr/bin/env python3
"""Seed demo data for one group with multiple members via the backend API.

Creates one group, joins random members (8-12 total), adds randomized
availability ranges for each member (10-20 ranges, each 3-7 days), verifies
the invite preview endpoint, and prints the share-ready invite link.

Usage:
  python backend/scripts/seed_single_person_demo.py
  python backend/scripts/seed_single_person_demo.py --api-base http://localhost:8000 --frontend-base http://localhost:5173
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any
from uuid import uuid4
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


@dataclass
class CreatedGroup:
    group_id: str
    name: str
    invite_link: str
    invite_expires_at: str | None


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
        with urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"{method} {url} failed with {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"{method} {url} failed: {exc.reason}") from exc


def _create_group(*, api_base: str, actor_id: str, display_name: str, group_name: str, origin: str) -> CreatedGroup:
    body = _request_json(
        method="POST",
        url=f"{api_base}/api/groups",
        headers={"X-Actor-Id": actor_id, "Origin": origin},
        payload={"groupName": group_name, "displayName": display_name},
    )

    return CreatedGroup(
        group_id=body["groupId"],
        name=body["name"],
        invite_link=body["inviteLink"],
        invite_expires_at=body.get("inviteExpiresAt"),
    )


def _add_availability(*, api_base: str, actor_id: str, group_id: str, start_iso: str, end_iso: str, origin: str) -> None:
    _request_json(
        method="POST",
        url=f"{api_base}/api/groups/{group_id}/availabilities",
        headers={"X-Actor-Id": actor_id, "Origin": origin},
        payload={"startDate": start_iso, "endDate": end_iso},
    )


def _verify_invite_preview(*, api_base: str, group_id: str, actor_id: str, origin: str) -> dict[str, Any]:
    return _request_json(
        method="GET",
        url=f"{api_base}/api/groups/{group_id}",
        headers={"X-Actor-Id": actor_id, "Origin": origin},
    )


def _join_group(*, api_base: str, actor_id: str, group_id: str, origin: str) -> dict[str, Any]:
    return _request_json(
        method="POST",
        url=f"{api_base}/api/groups/{group_id}/join",
        headers={"X-Actor-Id": actor_id, "Origin": origin},
    )


def _build_random_ranges(
    *,
    today: date,
    entries_count: int,
    min_duration_days: int,
    max_duration_days: int,
    start_horizon_days: int,
) -> list[tuple[date, date]]:
    ranges: list[tuple[date, date]] = []
    for _ in range(entries_count):
        start_offset = random.randint(0, start_horizon_days)
        duration = random.randint(min_duration_days, max_duration_days)
        start = today + timedelta(days=start_offset)
        end = start + timedelta(days=duration - 1)
        ranges.append((start, end))
    return ranges


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed one-group multi-member availability demo data via API")
    parser.add_argument("--api-base", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument(
        "--frontend-base",
        default="http://localhost:5173",
        help="Frontend base URL used to build share invite links",
    )
    parser.add_argument("--display-name", default="Marc Demo", help="Display name for owner actor")
    parser.add_argument(
        "--actor-id",
        default=f"demo-{uuid4()}",
        help="Actor id header; random by default to avoid collisions",
    )
    parser.add_argument("--group-name", default="Große Demo-Reise", help="Name of the created group")
    parser.add_argument("--min-members", type=int, default=8, help="Minimum members in group")
    parser.add_argument("--max-members", type=int, default=12, help="Maximum members in group")
    parser.add_argument("--min-entries", type=int, default=10, help="Minimum availability entries per member")
    parser.add_argument("--max-entries", type=int, default=20, help="Maximum availability entries per member")
    parser.add_argument("--min-duration", type=int, default=3, help="Minimum duration (days) per availability")
    parser.add_argument("--max-duration", type=int, default=7, help="Maximum duration (days) per availability")
    parser.add_argument("--horizon-days", type=int, default=180, help="Max start-day offset for random ranges")
    parser.add_argument("--seed", type=int, default=0, help="Optional random seed (0 = random)")
    parser.add_argument(
        "--output",
        default="",
        help="Optional file path to write invite links (one per line)",
    )

    args = parser.parse_args()

    api_base = args.api_base.rstrip("/")
    frontend_base = args.frontend_base.rstrip("/")

    if args.min_members < 1:
        raise RuntimeError("--min-members must be at least 1")
    if args.max_members < args.min_members:
        raise RuntimeError("--max-members must be >= --min-members")
    if args.min_entries < 1:
        raise RuntimeError("--min-entries must be at least 1")
    if args.max_entries < args.min_entries:
        raise RuntimeError("--max-entries must be >= --min-entries")
    if args.min_duration < 1:
        raise RuntimeError("--min-duration must be at least 1")
    if args.max_duration < args.min_duration:
        raise RuntimeError("--max-duration must be >= --min-duration")

    if args.seed:
        random.seed(args.seed)

    today = date.today()
    total_members = random.randint(args.min_members, args.max_members)

    print(f"Using owner actor: {args.actor_id}")
    print(f"Creating 1 group with {total_members} members...\n")

    group = _create_group(
        api_base=api_base,
        actor_id=args.actor_id,
        display_name=args.display_name,
        group_name=args.group_name,
        origin=frontend_base,
    )

    member_actor_ids = [args.actor_id]
    for index in range(2, total_members + 1):
        member_actor = f"demo-member-{index}-{uuid4()}"
        _join_group(
            api_base=api_base,
            actor_id=member_actor,
            group_id=group.group_id,
            origin=frontend_base,
        )
        member_actor_ids.append(member_actor)

    total_ranges = 0
    for actor in member_actor_ids:
        count = random.randint(args.min_entries, args.max_entries)
        ranges = _build_random_ranges(
            today=today,
            entries_count=count,
            min_duration_days=args.min_duration,
            max_duration_days=args.max_duration,
            start_horizon_days=args.horizon_days,
        )
        for start, end in ranges:
            _add_availability(
                api_base=api_base,
                actor_id=actor,
                group_id=group.group_id,
                start_iso=start.isoformat(),
                end_iso=end.isoformat(),
                origin=frontend_base,
            )
        total_ranges += count

    preview = _verify_invite_preview(
        api_base=api_base,
        group_id=group.group_id,
        actor_id=args.actor_id,
        origin=frontend_base,
    )

    print(f"✓ {group.name}")
    print(f"  groupId:      {group.group_id}")
    print(f"  members:      {total_members}")
    print(f"  ranges added: {total_ranges}")
    print(f"  inviteLink:   {group.invite_link}")
    print(f"  previewName:  {preview.get('name')}")
    print(f"  expiresAt:    {preview.get('inviteExpiresAt')}")
    print()

    share_links = [group.invite_link]

    print("Share-ready invite link:")
    print(group.invite_link)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write("\n".join(share_links) + "\n")
        print(f"\nSaved invite links to: {args.output}")

    print("\nDone.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1)
