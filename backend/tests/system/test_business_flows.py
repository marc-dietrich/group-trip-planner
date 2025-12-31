"""System-level business logic checks against real Postgres container."""

from datetime import date
from uuid import uuid4

import pytest
from jose import jwt

pytestmark = pytest.mark.asyncio


async def test_auth_required_for_protected_availability(client):
    headers = {"Authorization": f"Bearer {jwt.encode({'sub': str(uuid4())}, 'test-secret', algorithm='HS256')}"}
    create_res = await client.post(
        "/api/groups",
        headers=headers,
        json={"groupName": "Auth Required", "displayName": "Anon"},
    )
    assert create_res.status_code == 200
    group_id = create_res.json()["groupId"]

    res = await client.post(
        f"/api/groups/{group_id}/availabilities",
        json={"startDate": "2025-01-01", "endDate": "2025-01-02", "kind": "available"},
    )
    assert res.status_code == 401


async def test_group_creation_requires_auth(client):
    res = await client.post("/api/groups", json={"groupName": "No Auth", "displayName": "Anon"})
    assert res.status_code == 401


async def test_availability_requires_membership(client, token_factory):
    owner_id = str(uuid4())
    owner_headers = {"Authorization": f"Bearer {token_factory(owner_id)}"}
    create_res = await client.post(
        "/api/groups",
        headers=owner_headers,
        json={"groupName": "Foreign Group", "displayName": "Owner"},
    )
    assert create_res.status_code == 200
    group_id = create_res.json()["groupId"]

    other_user = str(uuid4())
    headers = {"Authorization": f"Bearer {token_factory(other_user)}"}

    res = await client.post(
        f"/api/groups/{group_id}/availabilities",
        headers=headers,
        json={"startDate": "2025-02-01", "endDate": "2025-02-02", "kind": "available"},
    )
    assert res.status_code == 403


async def test_invalid_date_range_rejected(client, user_identity):
    create_res = await client.post(
        "/api/groups",
        headers=user_identity["headers"],
        json={"groupName": "Bad Dates", "displayName": "Owner"},
    )
    group_id = create_res.json()["groupId"]

    res = await client.post(
        f"/api/groups/{group_id}/availabilities",
        headers=user_identity["headers"],
        json={"startDate": "2025-04-10", "endDate": "2025-04-05", "kind": "available"},
    )
    assert res.status_code == 400


async def test_availability_isolated_between_groups(client, user_identity):
    create_one = await client.post(
        "/api/groups",
        headers=user_identity["headers"],
        json={"groupName": "Trip One", "displayName": "Member"},
    )
    create_two = await client.post(
        "/api/groups",
        headers=user_identity["headers"],
        json={"groupName": "Trip Two", "displayName": "Member"},
    )
    group1 = create_one.json()["groupId"]
    group2 = create_two.json()["groupId"]

    await client.post(
        f"/api/groups/{group1}/availabilities",
        headers=user_identity["headers"],
        json={"startDate": "2025-05-01", "endDate": "2025-05-03", "kind": "available"},
    )

    res_two = await client.get(f"/api/groups/{group2}/availabilities", headers=user_identity["headers"])
    assert res_two.status_code == 200
    assert res_two.json() == []


async def test_nonexistent_group_returns_404(client, user_identity):
    missing_group = uuid4()
    res = await client.post(
        f"/api/groups/{missing_group}/availabilities",
        headers=user_identity["headers"],
        json={"startDate": "2025-06-01", "endDate": "2025-06-02", "kind": "available"},
    )
    assert res.status_code == 404


async def test_delete_availability_removes_entry(client, user_identity):
    create_res = await client.post(
        "/api/groups",
        headers=user_identity["headers"],
        json={"groupName": "Delete Flow", "displayName": "Owner"},
    )
    group_id = create_res.json()["groupId"]

    add_res = await client.post(
        f"/api/groups/{group_id}/availabilities",
        headers=user_identity["headers"],
        json={"startDate": "2025-07-01", "endDate": "2025-07-02", "kind": "available"},
    )
    assert add_res.status_code == 200
    availability_id = add_res.json()["id"] if "id" in add_res.json() else add_res.json()["id" if False else "id"]
    # Above fallback keeps mypy happy; API always returns id field
    del_res = await client.delete(f"/api/availabilities/{availability_id}", headers=user_identity["headers"])
    assert del_res.status_code == 204

    list_res = await client.get(f"/api/groups/{group_id}/availabilities", headers=user_identity["headers"])
    assert list_res.status_code == 200
    assert list_res.json() == []


async def test_invalid_kind_validation(client, user_identity):
    create_res = await client.post(
        "/api/groups",
        headers=user_identity["headers"],
        json={"groupName": "Kind Validation", "displayName": "Owner"},
    )
    group_id = create_res.json()["groupId"]

    res = await client.post(
        f"/api/groups/{group_id}/availabilities",
        headers=user_identity["headers"],
        json={"startDate": "2025-08-01", "endDate": "2025-08-02", "kind": "not-valid"},
    )
    assert res.status_code == 422
