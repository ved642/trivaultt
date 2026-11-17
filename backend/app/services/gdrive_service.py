import re
import urllib.parse
from typing import Tuple, Optional
import httpx


class GoogleDriveError(Exception):
    """Custom exception for Google Drive retrieval errors."""
    pass


class GoogleDriveService:
    """Service to safely fetch files from Google Drive via direct URL or OAuth token."""

    @staticmethod
    def extract_file_id(drive_url_or_id: str) -> str:
        s = drive_url_or_id.strip()
        # 1. Standard Google Drive link: /file/d/<id>/
        match = re.search(r'/file/d/([a-zA-Z0-9_-]{20,})', s)
        if match:
            return match.group(1)
        # 2. Google Docs / Sheets / Slides link: /d/<id>/
        match = re.search(r'/d/([a-zA-Z0-9_-]{20,})', s)
        if match:
            return match.group(1)
        # 3. Query param format: ?id=<id> or &id=<id>
        match = re.search(r'[?&]id=([a-zA-Z0-9_-]{20,})', s)
        if match:
            return match.group(1)
        # 4. Raw file ID
        if re.match(r'^[a-zA-Z0-9_-]{20,}$', s):
            return s

        raise GoogleDriveError(
            "Invalid Google Drive link or file ID. Please provide a valid Google Drive share link (e.g., https://drive.google.com/file/d/.../view) or a file ID."
        )

    @staticmethod
    def extract_filename_from_cd(cd_header: str) -> Optional[str]:
        if not cd_header:
            return None
        # RFC 5987 / RFC 6266 filename*
        match_utf8 = re.search(r"filename\*=(?:UTF-8''|utf-8'')([^;]+)", cd_header, re.IGNORECASE)
        if match_utf8:
            return urllib.parse.unquote(match_utf8.group(1).strip().strip('"\''))
        match = re.search(r'filename=["\']?([^"\';]+)["\']?', cd_header, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return None

    @classmethod
    async def fetch_file(
        cls,
        drive_url_or_id: str,
        custom_filename: Optional[str] = None,
        access_token: Optional[str] = None,
        max_bytes: int = 26214400,
    ) -> Tuple[bytes, str, str]:
        """
        Downloads a file from Google Drive into memory.
        Validates size against max_bytes limit.
        Returns: (file_bytes, filename, content_type)
        """
        file_id = cls.extract_file_id(drive_url_or_id)

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            # -------------------------------------------------------------
            # Strategy A: Authenticated request via Google Drive API v3
            # -------------------------------------------------------------
            if access_token:
                meta_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?fields=name,mimeType,size"
                headers = {"Authorization": f"Bearer {access_token}"}
                meta_res = await client.get(meta_url, headers=headers)

                resolved_name = custom_filename
                content_type = "application/octet-stream"

                if meta_res.status_code == 200:
                    meta = meta_res.json()
                    if not resolved_name:
                        resolved_name = meta.get("name")
                    content_type = meta.get("mimeType", content_type)
                elif meta_res.status_code == 404:
                    raise GoogleDriveError("Google Drive file not found. Please verify the file ID.")
                elif meta_res.status_code in (401, 403):
                    raise GoogleDriveError("Access denied by Google Drive. Check token permissions.")

                # If it's a native Google Docs document, export as PDF
                if content_type.startswith("application/vnd.google-apps."):
                    export_url = f"https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType=application/pdf"
                    media_res = await client.get(export_url, headers=headers)
                    content_type = "application/pdf"
                    if resolved_name and not resolved_name.lower().endswith(".pdf"):
                        resolved_name += ".pdf"
                else:
                    media_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
                    media_res = await client.get(media_url, headers=headers)

                if media_res.status_code != 200:
                    raise GoogleDriveError(f"Failed to download file from Google Drive (HTTP {media_res.status_code}).")

                file_bytes = media_res.content
                if len(file_bytes) == 0:
                    raise GoogleDriveError("The downloaded Google Drive file is empty (0 bytes).")
                if len(file_bytes) > max_bytes:
                    raise GoogleDriveError(f"File exceeds maximum allowed size of {max_bytes / (1024 * 1024):.1f} MB.")

                return file_bytes, resolved_name or f"gdrive_{file_id[:8]}", content_type

            # -------------------------------------------------------------
            # Strategy B: Public / Shared link download (Direct HTTP)
            # -------------------------------------------------------------
            # Attempt direct usercontent URL first
            download_url = f"https://drive.usercontent.google.com/download?id={file_id}&export=download"
            res = await client.get(download_url)

            # Check for Google Drive virus warning / confirmation page
            if res.status_code == 200 and "text/html" in res.headers.get("content-type", ""):
                confirm_match = re.search(r'confirm=([0-9a-zA-Z_]+)', res.text)
                if confirm_match:
                    confirm_code = confirm_match.group(1)
                    res = await client.get(f"{download_url}&confirm={confirm_code}")
                else:
                    # Try fallback to uc endpoint
                    alt_url = f"https://drive.google.com/uc?export=download&id={file_id}"
                    alt_res = await client.get(alt_url)
                    alt_confirm = re.search(r'confirm=([0-9a-zA-Z_]+)', alt_res.text)
                    if alt_confirm:
                        res = await client.get(f"{alt_url}&confirm={alt_confirm.group(1)}")
                    elif "text/html" not in alt_res.headers.get("content-type", ""):
                        res = alt_res

            content_type = res.headers.get("content-type", "application/octet-stream")

            # Detect error HTML pages
            if "text/html" in content_type:
                body_lower = res.text.lower()
                if "you need permission" in body_lower or "access denied" in body_lower or "sign in" in body_lower:
                    raise GoogleDriveError(
                        "File is private. Please ensure the file's sharing setting is set to 'Anyone with the link can view' on Google Drive."
                    )
                if "not found" in body_lower or "doesn't exist" in body_lower or "file not found" in body_lower:
                    raise GoogleDriveError("Google Drive file not found. Please verify the share link or file ID.")
                if len(res.content) < 15000 and ("google" in body_lower and "drive" in body_lower):
                    raise GoogleDriveError(
                        "Could not download file. Ensure the file permissions are set to 'Anyone with the link can view'."
                    )

            if res.status_code != 200:
                raise GoogleDriveError(f"Failed to fetch file from Google Drive (HTTP {res.status_code}).")

            file_bytes = res.content
            if len(file_bytes) == 0:
                raise GoogleDriveError("The downloaded Google Drive file is empty (0 bytes).")
            if len(file_bytes) > max_bytes:
                raise GoogleDriveError(f"File exceeds maximum allowed size of {max_bytes / (1024 * 1024):.1f} MB.")

            # Extract filename from Content-Disposition header
            cd_header = res.headers.get("content-disposition", "")
            extracted_filename = cls.extract_filename_from_cd(cd_header)

            final_filename = custom_filename or extracted_filename or f"gdrive_{file_id[:8]}.bin"
            clean_content_type = content_type.split(";")[0].strip() or "application/octet-stream"

            return file_bytes, final_filename, clean_content_type
