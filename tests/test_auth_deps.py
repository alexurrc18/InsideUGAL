import pytest
from unittest.mock import patch, MagicMock
import jwt
from jwt.exceptions import InvalidTokenError
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

from app.api.auth_deps import verify_supabase_token

def test_es256_token_with_invalid_signature_is_rejected():
    """Test that an ES256 token with an invalid signature is rejected."""
    # 1. Creăm un token fals format din 3 părți (Header, Payload, Signature)
    header_b64 = jwt.utils.base64url_encode(b'{"alg":"ES256","typ":"JWT","kid":"test-key-id"}').decode()
    payload_b64 = jwt.utils.base64url_encode(b'{"sub":"test-user-id","aud":"authenticated","exp":1900000000}').decode()
    invalid_token = f"{header_b64}.{payload_b64}.SemnaturaCompletGresitaSiFalsa"

    # 2. Generăm rapid o cheie publică ES256 complet validă matematic, dar care nu este a Supabase-ului
    private_key = ec.generate_private_key(ec.SECP256R1())
    valid_format_pem_key = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    # 3. Păcălim (mock) clientul JWKS să returneze această cheie validă ca format
    mock_key = MagicMock()
    mock_key.key = valid_format_pem_key

    with patch("app.api.auth_deps.jwks_client.get_signing_key_from_jwt", return_value=mock_key):
        # 4. Verificăm că funcția noastră aruncă InvalidTokenError pentru că semnătura nu se potrivește cu cheia
        with pytest.raises(InvalidTokenError):
            verify_supabase_token(invalid_token)