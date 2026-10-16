# Security, idempotency and retry

Backend commands require bearer authentication and project/role guards. AI callbacks use the separate `AiCallback` service scheme. Secrets, signing keys, callback URLs and object-store credentials must be injected by deployment configuration; none are documented as literals or client secrets.

Backend command idempotency uses `Idempotency-Key`; create/retry require it and retry also requires `If-Match`. API-031 requires the key and validates hashes. The AI repository's `IdempotencyManager` computes SHA-256 over `processing_block_id`, model version and manifest checksum and stores results in an in-memory dictionary. This is useful compatibility evidence but is not durable multi-instance idempotency or replay protection.

Retry rules: retry infrastructure failures with bounded backoff and the same canonical attempt payload; do not retry malformed data indefinitely. Duplicate same-payload callbacks should be replay-safe; differing payloads under one key must be a conflict. Current Backend latest-attempt fencing remains P1-02.

Do not log tokens, private evidence, raw credentials or full sensitive payloads. Validate artifact ownership/checksum before inference and callback. The AI UI server has permissive CORS and local file/static endpoints; it is a test bench and must not be treated as production security evidence.
