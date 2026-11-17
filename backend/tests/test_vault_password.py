from fastapi.testclient import TestClient


def test_vault_password_lifecycle(client: TestClient, auth_headers: dict):
    # 1. Initial status: No vault password
    res = client.get("/auth/vault-status", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["has_vault_password"] is False

    # 2. Try to set vault password with invalid account password
    res = client.post(
        "/auth/vault-password/set",
        headers=auth_headers,
        json={"vault_password": "VaultPin1234", "account_password": "WrongPassword!"}
    )
    assert res.status_code == 401
    assert "Incorrect account password" in res.json()["detail"]

    # 3. Set vault password with valid account password ("Password123!" from conftest)
    res = client.post(
        "/auth/vault-password/set",
        headers=auth_headers,
        json={"vault_password": "VaultPin1234", "account_password": "Password123!"}
    )
    assert res.status_code == 200
    assert res.json()["has_vault_password"] is True

    # 4. Verify status is now True
    res = client.get("/auth/vault-status", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["has_vault_password"] is True

    # 5. Verify vault password failure
    res = client.post(
        "/auth/vault-password/verify",
        headers=auth_headers,
        json={"vault_password": "WrongPin"}
    )
    assert res.status_code == 401

    # 6. Verify vault password success
    res = client.post(
        "/auth/vault-password/verify",
        headers=auth_headers,
        json={"vault_password": "VaultPin1234"}
    )
    assert res.status_code == 200
    assert res.json()["success"] is True

    # 7. Change vault password
    res = client.post(
        "/auth/vault-password/change",
        headers=auth_headers,
        json={
            "current_vault_password": "VaultPin1234",
            "new_vault_password": "NewVaultPin5678"
        }
    )
    assert res.status_code == 200

    # 8. Verify old password fails, new password succeeds
    res_old = client.post(
        "/auth/vault-password/verify",
        headers=auth_headers,
        json={"vault_password": "VaultPin1234"}
    )
    assert res_old.status_code == 401

    res_new = client.post(
        "/auth/vault-password/verify",
        headers=auth_headers,
        json={"vault_password": "NewVaultPin5678"}
    )
    assert res_new.status_code == 200

    # 9. Remove vault password
    res = client.post(
        "/auth/vault-password/remove",
        headers=auth_headers,
        json={"account_password": "Password123!"}
    )
    assert res.status_code == 200
    assert res.json()["has_vault_password"] is False


def test_file_summary_endpoint(client: TestClient, auth_headers: dict):
    res = client.get("/files/summary", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_count" in data
    assert "total_size_bytes" in data
    assert isinstance(data["total_count"], int)
    assert isinstance(data["total_size_bytes"], int)
