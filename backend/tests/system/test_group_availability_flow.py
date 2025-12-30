"""End-to-end happy path using the real database container."""

from datetime import date
from uuid import uuid4

import pytest

pytestmark = pytest.mark.asyncio


async def test_group_user_availability_flow(client, user_identity):
    actor_id = f"actor-{uuid4()}"

    create_group_res = await client.post(
        "/api/groups",
        json={"groupName": "System Test Trip", "actorId": actor_id, "displayName": "Anon"},
    )
    assert create_group_res.status_code == 200
    group_body = create_group_res.json()
    group_id = group_body["groupId"]

    claim_res = await client.post(
        "/api/auth/claim",
        headers=user_identity["headers"],
        json={"actorId": actor_id},
    )
    assert claim_res.status_code == 200
    claim_body = claim_res.json()
    assert claim_body["userId"] == user_identity["user_id"]

    payload = {
        "startDate": date(2025, 3, 5).isoformat(),
        "endDate": date(2025, 3, 8).isoformat(),
        "kind": "available",
    }
    add_res = await client.post(
        f"/api/groups/{group_id}/availabilities",
        headers=user_identity["headers"],
        json=payload,
    )
    assert add_res.status_code == 200
    availability = add_res.json()
    assert availability["groupId"] == group_id
    assert availability["userId"] == user_identity["user_id"]

    list_res = await client.get(f"/api/groups/{group_id}/availabilities", headers=user_identity["headers"])
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["startDate"] == payload["startDate"]
    assert items[0]["endDate"] == payload["endDate"]

    groups_res = await client.get("/api/groups", headers=user_identity["headers"])
    assert groups_res.status_code == 200
    groups = groups_res.json()
    assert any(g["groupId"] == group_id for g in groups)
