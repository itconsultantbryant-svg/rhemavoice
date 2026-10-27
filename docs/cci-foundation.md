# Chayil Company Intensive (CCI) — Foundation

CCI is a program inside RhemaAcademy and uses the existing RhemaVoice account,
JWT sessions, notifications, and Academy membership. It has no separate login.

## Implemented stage

This first stage provides the CCI Command Center, controlled role assignments, official
announcements, auditable tasks, and truthful integration setup states. The API
requires an active Academy membership (or platform administrator) before it
returns program data. It does not create demo students, readiness scores, or
policy decisions.

## Schema

Migration `academy.0004_cci_foundation` adds:

| Entity | Purpose | Key constraints |
|---|---|---|
| `CCIRoleAssignment` | CCI responsibility on an existing Academy user | unique institution/user/role; active-state index |
| `CCITask` | Program/staff task with owner, due date and lifecycle | indexed by institution/status/due date and assignee/status |
| `CCIAnnouncement` | Published, audience-scoped notice | indexed by institution, published state, audience |
| `CCIAuditEvent` | Immutable application audit record | indexed by institution/date and target |

All records have UUID primary keys and timestamps. Sensitive later-stage
records (admissions, formation, grades, attendance, files) are deliberately
not represented by generic fields; they require their own permission and
retention design before implementation.

## CCI permission matrix

| Role | Command center | Create tasks | Publish announcements | Later-stage scope |
|---|---|---|---|---|
| Founder | all authorized program data | yes | yes | executive oversight |
| Program Director | all authorized program data | yes | yes | program operations |
| Curriculum Director | staff program data | yes | no | curriculum and assessments |
| Administration | staff program data | yes | yes | admissions and student success |
| Formation Coordinator | staff program data | yes | no | formation and mentors |
| Technology Director | staff program data | yes | no | technical operations |
| Communications Director | staff program data | yes | yes | communications |
| Instructor / Mentor | assigned and staff-visible tasks | no | no | only assigned learners later |
| Student | assigned tasks and student/all notices | may update own task status | no | own records only |
| Platform/System Administrator | platform override | yes | yes | technical administration only |

Server-side enforcement is in `apps/neon-api/src/routes/academy.ts`. A client
can never grant itself a role: assignments must be created through the
authorized CCI role-management workflow. Founders, Program Directors,
Administration, and Platform/System Administrators can manage roles; an active
Academy membership is required before a role can be granted. Every role change,
task creation/state change, and announcement publication writes `CCIAuditEvent`.

## API

- `GET /api/v1/academy/institutions/:code/cci/command-center/`
- `POST /api/v1/academy/institutions/:code/cci/tasks/` — CCI managers only
- `PATCH /api/v1/academy/institutions/:code/cci/tasks/:id/` — manager or assignee status update
- `POST /api/v1/academy/institutions/:code/cci/announcements/` — authorized announcers only
- `GET /api/v1/academy/institutions/:code/cci/members/` — CCI managers only
- `POST /api/v1/academy/institutions/:code/cci/members/:userId/roles/` — authorized role managers only
- `DELETE /api/v1/academy/institutions/:code/cci/members/:userId/roles/:role/` — authorized role managers only
- `GET|POST /api/v1/academy/institutions/:code/cci/resources/` — approved library access / CCI managers create drafts
- `POST /api/v1/academy/institutions/:code/cci/resources/:id/submit/` — creator or manager submits a draft
- `POST /api/v1/academy/institutions/:code/cci/resources/:id/review/` — authorized CCI reviewers approve or reject
- `GET|POST /api/v1/academy/institutions/:code/cci/events/` — CCI calendar; creation requires a CCI manager
- `PATCH /api/v1/academy/institutions/:code/cci/events/:id/` — manager sets scheduled, completed, or cancelled
- `GET|PUT /api/v1/academy/institutions/:code/cci/admissions/me/` — applicant's own configurable application only
- `POST /api/v1/academy/institutions/:code/cci/admissions/me/submit/` — submits the applicant's draft
- `GET /api/v1/academy/institutions/:code/cci/admissions/` and `POST .../:id/review/` — authorized admissions staff only

## External services

CCI file storage and calendar integration are explicitly reported as
`pending_configuration`; no upload, calendar event, or notification is claimed
as delivered until a provider is configured. Before enabling them, supply:

- private object storage endpoint/bucket/region/credentials and retention rules;
- calendar provider OAuth client, redirect URLs, and consent policy;
- transactional email/push provider for reminders.

CCI events are database-backed, but reminder delivery and external calendar
sync are intentionally `not_configured` until those provider credentials and
consent/notification policies are supplied.

## Admissions privacy

Admissions fields are configurable JSON so no institutional questions, scoring,
or decision rules are invented. Applicants may read only their own application.
Only Founder, Program Director, Administration, and Platform/System
Administrator can list or review submitted applications. Application changes
and decisions are recorded in `CCIAuditEvent`. File attachments are not yet
accepted; add private storage and retention rules before collecting them.

## Formation and attendance

`CCIFormationNote` stores staff-authored notes with explicit `staff` or
`student` visibility; students retrieve only their own student-visible notes.
`CCIAttendanceRecord` stores the status, optional CCI event, author, and time.
Only authorized formation staff can write either record, and each mutation is
audited. The staff student-record endpoint additionally limits mentors to their
own assigned students; other authorized formation staff can view CCI records.

## Gradebook

CCI gradebook routes expose submitted work only to Founder, Program Director,
Curriculum Director, Instructor, or Platform/System Administrator. Scores are
validated against each assignment's configured maximum. Each score change writes
both `CCIGradeChange` (previous score, new score, reason, actor, time) and a
platform CCI audit event. Students can retrieve only their own graded work.
No grading policy, weighting, or pass/fail rule is inferred.

## Executive reporting

The CCI overview report is restricted to authorized leadership and reports only
aggregate stored counts: active members, tasks, admissions, attendance, and
submitted/graded assessments. It does not expose private applicant, student,
formation, or grade details beyond the viewer's authorized workflow.

## Staff Connect

Staff Connect uses separate CCI records, not public chat. Only users with an
active non-student CCI role can read or create posts; each creation is audited.
File sharing and real-time delivery remain pending secure-storage and messaging
provider configuration.

## Bonding Corner

Bonding Corner posts are private to active CCI participants and default to
`pending` moderation. Only approved posts are visible to other participants;
the author can see their own pending/rejected posts. Authorized CCI moderators
approve or reject posts, with every submission and decision recorded in the
CCI audit log.

Keep secrets in Neon Function environment variables, never `NEXT_PUBLIC_*` or
the browser. Apply Django migrations to the Neon schema with the documented
`scripts/migrate-to-neon.sh` deployment procedure before deploying the API.

Resources cannot be downloaded or uploaded until private storage is configured.
Set `CCI_STORAGE_ENABLED=true` and `CCI_STORAGE_BUCKET` only after the upload,
malware-scanning, signed-download, and retention implementation is deployed.

## Release verification

CI type-checks the Neon API and Expo mobile app in addition to the web/admin
builds. Before a CCI release, apply migrations `0004` through `0011` to the
same PostgreSQL schema used by the Neon Function, then verify each protected
route with accounts representing a student, mentor, instructor, CCI leadership,
and platform administrator. Confirm denied roles receive `403` rather than a
partial/private response.

`./scripts/smoke-api.sh <function-url>` also verifies CCI Command Center,
Bonding Corner, and that the seeded member account is denied Staff Connect.

## Next CCI stages

1. Role-assignment management UI and approval workflow.
2. Calendar, task reminders, secure resource library, and versioned approvals.
3. Admissions and student information, with a supplied institutional data and retention policy.
4. Assessment/gradebook, mentors/formation, then attendance; each with separate
   role-bound APIs, audit trails, and privacy tests.
