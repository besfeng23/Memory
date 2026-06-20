# Disabled Idempotency Contract

The disabled ingest route returns idempotency and response-cache contracts without storing or claiming keys.

The idempotency contract shape is:

```json
{
  "key_present": true,
  "key_stored": false,
  "claim_attempted": false,
  "conflict_evaluated": false,
  "conflict_status": "not_evaluated"
}
```

The response-cache contract shape is:

```json
{
  "cache_supported": false,
  "cache_lookup_attempted": false,
  "cache_write_attempted": false,
  "replay_supported": false,
  "replay_status": "not_available"
}
```

This keeps the future response shape explicit while the route remains disabled.

No key is persisted.
No claim is attempted.
No conflict check is performed.
No response cache lookup is attempted.
No response cache write is attempted.
No replay is performed.
No memory state is changed.
