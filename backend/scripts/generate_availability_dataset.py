#!/usr/bin/env python3
"""Generate randomized group/member availability demo data into JSON.

This script does NOT write to the backend.
It only produces a dataset file consumed by insert_availability_dataset.py.
"""

from __future__ import annotations

import argparse
import json
import random
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from uuid import uuid4


@dataclass
class RangeItem:
    start: str
    end: str


def _build_ranges(
    *,
    today: date,
    entries_count: int,
    min_duration_days: int,
    max_duration_days: int,
    start_horizon_days: int,
) -> list[RangeItem]:
    items: list[RangeItem] = []
    for _ in range(entries_count):
        start_offset = random.randint(0, start_horizon_days)
        duration = random.randint(min_duration_days, max_duration_days)
        start = today + timedelta(days=start_offset)
        end = start + timedelta(days=duration - 1)
        items.append(RangeItem(start=start.isoformat(), end=end.isoformat()))
    return items


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate random group availability dataset JSON")
    parser.add_argument("--output", default="backend/scripts/demo_availability_dataset.json", help="Output JSON file")
    parser.add_argument("--group-name", default="Große Demo-Reise", help="Group name")
    parser.add_argument("--owner-display-name", default="Marc Demo", help="Owner display name")
    parser.add_argument("--owner-actor-id", default=f"demo-owner-{uuid4()}", help="Owner actor id")
    parser.add_argument("--min-members", type=int, default=10)
    parser.add_argument("--max-members", type=int, default=12)
    parser.add_argument("--min-entries", type=int, default=22)
    parser.add_argument("--max-entries", type=int, default=30)
    parser.add_argument("--min-duration", type=int, default=7)
    parser.add_argument("--max-duration", type=int, default=14)
    parser.add_argument("--horizon-days", type=int, default=75)
    parser.add_argument("--seed", type=int, default=0)

    args = parser.parse_args()

    if args.min_members < 1:
        raise SystemExit("--min-members must be >= 1")
    if args.max_members < args.min_members:
        raise SystemExit("--max-members must be >= --min-members")
    if args.min_entries < 1:
        raise SystemExit("--min-entries must be >= 1")
    if args.max_entries < args.min_entries:
        raise SystemExit("--max-entries must be >= --min-entries")
    if args.min_duration < 1:
        raise SystemExit("--min-duration must be >= 1")
    if args.max_duration < args.min_duration:
        raise SystemExit("--max-duration must be >= --min-duration")

    if args.seed:
        random.seed(args.seed)

    today = date.today()
    total_members = random.randint(args.min_members, args.max_members)

    members: list[dict] = []

    owner_ranges_count = random.randint(args.min_entries, args.max_entries)
    members.append(
        {
            "actorId": args.owner_actor_id,
            "displayName": args.owner_display_name,
            "ranges": [
                {"startDate": item.start, "endDate": item.end}
                for item in _build_ranges(
                    today=today,
                    entries_count=owner_ranges_count,
                    min_duration_days=args.min_duration,
                    max_duration_days=args.max_duration,
                    start_horizon_days=args.horizon_days,
                )
            ],
        }
    )

    for index in range(2, total_members + 1):
        actor_id = f"demo-member-{index}-{uuid4()}"
        ranges_count = random.randint(args.min_entries, args.max_entries)
        ranges = _build_ranges(
            today=today,
            entries_count=ranges_count,
            min_duration_days=args.min_duration,
            max_duration_days=args.max_duration,
            start_horizon_days=args.horizon_days,
        )
        members.append(
            {
                "actorId": actor_id,
                "displayName": f"Member {index}",
                "ranges": [{"startDate": item.start, "endDate": item.end} for item in ranges],
            }
        )

    payload = {
        "groupName": args.group_name,
        "ownerActorId": args.owner_actor_id,
        "ownerDisplayName": args.owner_display_name,
        "members": members,
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    total_ranges = sum(len(member["ranges"]) for member in members)
    print(f"Dataset written: {output_path}")
    print(f"Members: {len(members)}")
    print(f"Ranges: {total_ranges}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
