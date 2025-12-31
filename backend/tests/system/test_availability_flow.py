"""System-level availability flows and guards against real Postgres container."""

from datetime import date
from uuid import uuid4

import pytest

pytestmark = pytest.mark.asyncio


async def create_group(client, *, group_name: str, display_name: str, headers):
    res = await client.post(
        "/api/groups",
        headers=headers,
        json={"groupName": group_name, "displayName": display_name},
    )
    assert res.status_code == 200
    return res.json()["groupId"]


async def add_availability(client, *, group_id, headers, start: str, end: str, kind: str = "available"):
    res = await client.post(
        f"/api/groups/{group_id}/availabilities",
        headers=headers,
        json={"startDate": start, "endDate": end, "kind": kind},
    )
    return res


async def test_happy_path_group_user_availability_flow(client, user_identity):
    group_id = await create_group(
        client,
        group_name="System Test Trip",
        display_name="Anon",
        headers=user_identity["headers"],
    )

    start = date(2025, 3, 5).isoformat()
    end = date(2025, 3, 8).isoformat()
    add_res = await add_availability(
        client,
        group_id=group_id,
        headers=user_identity["headers"],
        start=start,
        end=end,
    )
    assert add_res.status_code == 200
    availability = add_res.json()
    assert availability["groupId"] == group_id
    assert availability["userId"] == user_identity["user_id"]

    list_res = await client.get(f"/api/groups/{group_id}/availabilities", headers=user_identity["headers"])
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["startDate"] == start
    assert items[0]["endDate"] == end

    groups_res = await client.get("/api/groups", headers=user_identity["headers"])
    assert groups_res.status_code == 200
    groups = groups_res.json()
    assert any(g["groupId"] == group_id for g in groups)


async def test_auth_required_for_protected_availability(client, user_identity):
    group_id = await create_group(
        client,
        group_name="Auth Required",
        display_name="Anon",
        headers=user_identity["headers"],
    )

    res = await add_availability(
        client,
        group_id=group_id,
        headers=None,
        start="2025-01-01",
        end="2025-01-02",
    )
    assert res.status_code == 401


async def test_group_lists_for_owner(client, user_identity):
    group_id = await create_group(
        client,
        group_name="Listable Group",
        display_name="Anon",
        headers=user_identity["headers"],
    )

    list_res = await client.get("/api/groups", headers=user_identity["headers"])
    assert list_res.status_code == 200
    groups = list_res.json()
    assert any(g["groupId"] == group_id for g in groups)


async def test_availability_requires_membership(client, user_identity, token_factory):
    group_id = await create_group(
        client,
        group_name="Foreign Group",
        display_name="Owner",
        headers=user_identity["headers"],
    )

    other_user = str(uuid4())
    headers = {"Authorization": f"Bearer {token_factory(other_user)}"}

    res = await add_availability(
        client,
        group_id=group_id,
        headers=headers,
        start="2025-02-01",
        end="2025-02-02",
    )
    assert res.status_code == 403


async def test_invalid_date_range_rejected(client, user_identity):
    group_id = await create_group(
        client,
        group_name="Bad Dates",
        display_name="Owner",
        headers=user_identity["headers"],
    )

    res = await add_availability(
        client,
        group_id=group_id,
        headers=user_identity["headers"],
        start="2025-04-10",
        end="2025-04-05",
    )
    assert res.status_code == 400


async def test_availability_isolated_between_groups(client, user_identity):
    group1 = await create_group(
        client,
        group_name="Trip One",
        display_name="Member",
        headers=user_identity["headers"],
    )
    group2 = await create_group(
        client,
        group_name="Trip Two",
        display_name="Member",
        headers=user_identity["headers"],
    )

    await add_availability(
        client,
        group_id=group1,
        headers=user_identity["headers"],
        start="2025-05-01",
        end="2025-05-03",
    )

    res_two = await client.get(f"/api/groups/{group2}/availabilities", headers=user_identity["headers"])
    assert res_two.status_code == 200
    assert res_two.json() == []


async def test_nonexistent_group_returns_404(client, user_identity):
    missing_group = uuid4()
    res = await add_availability(
        client,
        group_id=missing_group,
        headers=user_identity["headers"],
        start="2025-06-01",
        end="2025-06-02",
    )
    assert res.status_code == 404


async def test_delete_availability_removes_entry(client, user_identity):
    group_id = await create_group(
        client,
        group_name="Delete Flow",
        display_name="Owner",
        headers=user_identity["headers"],
    )

    add_res = await add_availability(
        client,
        group_id=group_id,
        headers=user_identity["headers"],
        start="2025-07-01",
        end="2025-07-02",
    )
    assert add_res.status_code == 200
    availability_id = add_res.json()["id"]

    del_res = await client.delete(f"/api/availabilities/{availability_id}", headers=user_identity["headers"])
    assert del_res.status_code == 204

    list_res = await client.get(f"/api/groups/{group_id}/availabilities", headers=user_identity["headers"])
    assert list_res.status_code == 200
    assert list_res.json() == []


async def test_invalid_kind_validation(client, user_identity):
    group_id = await create_group(
        client,
        group_name="Kind Validation",
        display_name="Owner",
        headers=user_identity["headers"],
    )

    res = await add_availability(
        client,
        group_id=group_id,
        headers=user_identity["headers"],
        start="2025-08-01",
        end="2025-08-02",
        kind="not-valid",
    )
    assert res.status_code == 422
