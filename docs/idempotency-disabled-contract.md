# Disabled Idempotency Contract

The disabled ingest route returns an idempotency contract without storing or claiming keys.

The contract shape is:

```json
{
  "key_present": true,
  "key_stored": false,
  "claim_attempted": false,
  "conflict_evaluated": false,
  "conflict_status": "not_evaluated"
}
```

This keeps the future response shape explicit while the route remains disabled.

No key is persisted.
No claim is attempted.
No conflict check is performed.
No memory state is changed.
