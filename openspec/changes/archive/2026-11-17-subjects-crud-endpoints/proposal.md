# Proposal

## Why

Users need to manage academic subjects throughout their academic lifecycle via standard RESTful operations. To ensure strict data privacy and security in a multi-tenant environment, all CRUD endpoints must enforce filtering by the authenticated user's ID (`user_id`).

## What Changes

- Add RESTful CRUD endpoints for `subjects` in XanoScript with mandatory authentication (`auth = "user"`) and tenant isolation (`user_id == $auth.id`):
  - POST `/subjects`: Create a new subject assigned to the authenticated user.
  - GET `/subjects`: List all subjects belonging to the authenticated user.
  - GET `/subjects/{id}`: Retrieve a specific subject belonging to the authenticated user.
  - PATCH `/subjects/{id}`: Update subject fields (`name`, `teacher`, `hours`) scoped to the authenticated user.
  - DELETE `/subjects/{id}`: Delete a subject belonging to the authenticated user.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `subjects`: Adds RESTful CRUD endpoints (POST, GET, PATCH, DELETE) with mandatory `user_id` security isolation.

## Impact

- Adds new API query definitions in `apis/subjects/`.
- Consumes existing `subjects` table without altering its database schema.
