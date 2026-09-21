"""Stateless, tamper-evident self-paced completion certificates."""

from datetime import date
from uuid import uuid4

from itsdangerous import BadSignature, SignatureExpired, URLSafeSerializer, URLSafeTimedSerializer


def assessment_proof(secret, score):
    if not secret or len(secret) < 32 or score < 5:
        return None
    return URLSafeTimedSerializer(secret, salt="cybermindspace-assessment-v1").dumps({"score": score, "nonce": uuid4().hex})


def score_from_proof(secret, proof):
    if not secret or len(secret) < 32 or not isinstance(proof, str) or len(proof) > 600:
        return None
    try:
        payload = URLSafeTimedSerializer(secret, salt="cybermindspace-assessment-v1").loads(proof, max_age=600)
    except (BadSignature, SignatureExpired):
        return None
    return payload.get("score") if isinstance(payload, dict) and payload.get("score") in (5, 6) else None


def issue(secret, name, score):
    if not secret or len(secret) < 32:
        return None
    clean_name = " ".join(name.split()) if isinstance(name, str) else ""
    if not 2 <= len(clean_name) <= 70 or any(ord(char) < 32 for char in clean_name):
        return None
    payload = {"name": clean_name, "score": score, "issued": date.today().isoformat(), "nonce": uuid4().hex[:12]}
    return URLSafeSerializer(secret, salt="cybermindspace-certificate-v1").dumps(payload)


def verify(secret, certificate_id):
    if not secret or len(secret) < 32 or not isinstance(certificate_id, str) or len(certificate_id) > 600:
        return None
    try:
        payload = URLSafeSerializer(secret, salt="cybermindspace-certificate-v1").loads(certificate_id)
    except BadSignature:
        return None
    if not isinstance(payload, dict) or payload.get("score", 0) < 5:
        return None
    return {key: payload[key] for key in ("name", "score", "issued") if key in payload}
