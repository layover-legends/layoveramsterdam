# Layover Legends — API v1

Base URL: `https://layover-legends.com/api/v1`

All responses follow the envelope:

```json
{ "data": <payload or null>, "error": <string or null>, "status": <http_code> }
```

Authentication: Bearer token from Supabase Auth session (cookie-based for browser clients; pass `Authorization: Bearer <access_token>` for API clients).

---

## POST /layovers

Create a layover (entry funnel). No auth required — `user_id` is attached if a session cookie is present.

**Request**: `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| city_id | uuid | yes |
| flight_in_at | datetime-local | yes |
| flight_out_at | datetime-local | yes |
| arrival_flight | string | no |
| arrival_terminal | string | no |
| departure_flight | string | no |
| departure_terminal | string | no |
| party_size | int (1–12) | no (default 1) |
| has_checked_bags | checkbox ("on") | no |

**Response 201**:
```json
{ "data": { "id": "<uuid>" }, "error": null, "status": 201 }
```

---

## POST /bookings

Create a booking (status=`pending_payment`). Stripe payment wired in Phase 8.

**Auth required.**

**Request**: `application/json`

```json
{
  "tour_id": "<uuid>",
  "layover_id": "<uuid or null>"
}
```

Pricing is computed server-side: `tour.price_cents × party_size`. Party size is pulled from the layover when provided.

**Response 201**:
```json
{ "data": { "id": "<uuid>" }, "error": null, "status": 201 }
```

---

## GET /bookings/:id

Retrieve a booking by ID. Only the booking owner can read it.

**Auth required.**

**Response 200**:
```json
{
  "data": {
    "id": "<uuid>",
    "tour_id": "<uuid>",
    "layover_id": "<uuid|null>",
    "party_size": 2,
    "scheduled_pickup_at": "<iso8601>",
    "scheduled_dropoff_at": "<iso8601>",
    "base_cents": 13800,
    "addons_cents": 0,
    "total_cents": 13800,
    "currency": "EUR",
    "status": "pending_payment",
    "created_at": "<iso8601>",
    "tours": { "name": "...", "slug": "..." }
  },
  "error": null,
  "status": 200
}
```

---

## Versioning policy

All endpoints live under `/api/v1/`. When a breaking change is required, a `/api/v2/` prefix will be introduced without removing v1 for a minimum of 6 months. Stable response shapes are the contract for airline/partner integrations (Blueprint+ M4).

---

## Error codes

| Status | Meaning |
|---|---|
| 400 | Bad request (malformed body) |
| 401 | Authentication required |
| 404 | Resource not found or not yours |
| 422 | Validation failed — see `error` field |
| 500 | Server error |
