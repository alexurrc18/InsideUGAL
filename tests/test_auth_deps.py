import jwt
from jwt import InvalidTokenError
from unittest.mock import MagicMock, patch
import pytest

from app.api.auth_deps import verify_supabase_token


def test_es256_token_with_invalid_signature_is_rejected():
    """Test that an ES256 token with an invalid signature is rejected."""
    header_b64 = jwt.utils.base64url_encode(b'{"alg":"ES256","typ":"JWT","kid":"test-key-id"}')
    payload_b64 = jwt.utils.base64url_encode(b'{"sub":"test-user-id","aud":"authenticated","exp":1900000000}')
    invalid_token = f"{header_b64.decode()}.{payload_b64.decode()}.InvalidSignature"

    mock_key = MagicMock()
    mock_key.key = "mock-signing-key"

    with patch("app.api.auth_deps.jwks_client.get_signing_key_from_jwt", return_value=mock_key):
        with pytest.raises(InvalidTokenError):
            verify_supabase_token(invalid_token)