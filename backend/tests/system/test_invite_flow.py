"""System test for invite-based join flow using real Postgres container."""

from uuid import uuid4

import pytest

pytestmark = pytest.mark.asyncio


async def test_invite_full_flow(client, token_factory):
    # Owner creates a group
    owner_id = str(uuid4())
    owner_headers = {"Authorization": f"Bearer {token_factory(owner_id)}"}
    create_res = await client.post(
        "/api/groups",
        headers=owner_headers,
        json={"groupName": "Invite Trip", "displayName": "Owner"},
    )
    assert create_res.status_code == 200
    group = create_res.json()
    group_id = group["groupId"]

    # Public invite preview fetch
    preview_res = await client.get(f"/api/groups/{group_id}")
    assert preview_res.status_code == 200
    preview = preview_res.json()
    assert preview["groupId"] == group_id
    assert preview["name"] == "Invite Trip"

    # Guest accepts invite
    guest_id = str(uuid4())
    guest_headers = {"Authorization": f"Bearer {token_factory(guest_id)}"}
    join_res = await client.post(f"/api/groups/{group_id}/join", headers=guest_headers)
    assert join_res.status_code == 200
    join_body = join_res.json()
    assert join_body["groupId"] == group_id
    assert join_body["alreadyMember"] is False
    assert join_body["role"] == "member"

    # Guest sees membership in their group list
    list_res = await client.get("/api/groups", headers=guest_headers)
    assert list_res.status_code == 200
    groups = list_res.json()
    assert any(g["groupId"] == group_id for g in groups)

    # Joining again is idempotent
    repeat = await client.post(f"/api/groups/{group_id}/join", headers=guest_headers)
    assert repeat.status_code == 200
    assert repeat.json()["alreadyMember"] is True
