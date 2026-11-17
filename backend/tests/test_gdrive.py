import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from app.services.gdrive_service import GoogleDriveService, GoogleDriveError


def test_extract_file_id_valid_formats():
    valid_cases = [
        ("https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing", "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"),
        ("https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs", "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"),
        ("https://drive.google.com/uc?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs&export=download", "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"),
        ("https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/edit", "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"),
        ("https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/edit#gid=0", "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"),
        ("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs", "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"),
    ]
    for url, expected_id in valid_cases:
        assert GoogleDriveService.extract_file_id(url) == expected_id


def test_extract_file_id_invalid_formats():
    invalid_cases = [
        "https://example.com/not-drive",
        "short_id",
        "",
        "   ",
    ]
    for invalid in invalid_cases:
        with pytest.raises(GoogleDriveError):
            GoogleDriveService.extract_file_id(invalid)


def test_extract_filename_from_content_disposition():
    cd_utf8 = "attachment; filename*=UTF-8''confidential%20report.pdf"
    assert GoogleDriveService.extract_filename_from_cd(cd_utf8) == "confidential report.pdf"

    cd_simple = 'attachment; filename="data_backup.csv"'
    assert GoogleDriveService.extract_filename_from_cd(cd_simple) == "data_backup.csv"

    cd_unquoted = "attachment; filename=plain_text.txt"
    assert GoogleDriveService.extract_filename_from_cd(cd_unquoted) == "plain_text.txt"

    assert GoogleDriveService.extract_filename_from_cd("") is None


def test_import_google_drive_success(client: TestClient, auth_headers: dict):
    mock_bytes = b"TriVault confidential content imported from Google Drive."
    mock_filename = "gdrive_test_document.pdf"
    mock_type = "application/pdf"

    with patch(
        "app.services.gdrive_service.GoogleDriveService.fetch_file",
        new_callable=AsyncMock
    ) as mock_fetch:
        mock_fetch.return_value = (mock_bytes, mock_filename, mock_type)

        res = client.post(
            "/files/import-google-drive",
            headers=auth_headers,
            json={
                "drive_url_or_id": "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
                "custom_filename": "renamed_on_import.pdf"
            }
        )
        assert res.status_code == 201
        data = res.json()
        assert data["filename"] == "renamed_on_import.pdf"
        assert data["size"] == len(mock_bytes)
        assert data["shard_count"] == 3
        file_id = data["id"]

        # Verify downloading the imported file decrypts to exact original bytes
        dl_res = client.get(f"/files/{file_id}/download", headers=auth_headers)
        assert dl_res.status_code == 200
        assert dl_res.content == mock_bytes


def test_import_google_drive_invalid_url(client: TestClient, auth_headers: dict):
    res = client.post(
        "/files/import-google-drive",
        headers=auth_headers,
        json={"drive_url_or_id": "invalid-drive-link"}
    )
    assert res.status_code == 400
    assert "Invalid Google Drive link" in res.json()["detail"]


def test_import_google_drive_unauthenticated(client: TestClient):
    res = client.post(
        "/files/import-google-drive",
        json={"drive_url_or_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"}
    )
    assert res.status_code == 401
