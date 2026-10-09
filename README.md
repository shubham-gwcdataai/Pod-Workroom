# POD workroom

A POD team portal with separate admin and member workspaces. Members submit one daily check-in per date with Date, Name, Yesterday's Activity, Today's Activity, Blockers, and Solved / Not status. Admins review those reports and unresolved blockers alongside the separate assignment queue.

## Run locally

```sh
npm install
npm run dev
```

The application opens with an email-only access screen. Configure the administrator in `.env`:

```env
VITE_ADMIN_EMAIL=admin@pod.local
VITE_ADMIN_NAME=POD Administrator
VITE_ADMIN_TITLE=Administrator
```

The configured administrator is seeded into the `Admin_Login` collection. Members are added through the admin dashboard and stored in `POD_Members` with one of three roles: Team lead, Team head, or Team member. Entering a member's email opens that member's dashboard and applies the stored role.

Outside a Domo iframe, the app uses browser local storage so workflows can be tested without an AppDB connection. The dashboard starts empty; no sample members, assignments, or check-ins are added.

## Test against Domo AppDB locally

Plain `npm run dev` uses browser storage. To use your Domo collections locally, first authenticate the Domo CLI with `domo login`. Then run these in separate terminals:

```sh
domo dev
npm run dev:appdb
```

Open `http://localhost:5175/?domoDev=1`. Vite forwards `/domo/*` requests through the authenticated Domo dev proxy on port 3000. Keep the Domo dev proxy running while using this URL.

## Domo AppDB

When hosted in Domo, the app uses `ryuu.js` AppDB. The manifest maps `Admin_Login`, `POD_Members`, `POD_WorkItems`, and `POD_DailyUpdates`. The configured administrator is initialized when the admin collection is empty; member records and roles are read from and written to `POD_Members`. Dashboard records are read from AppDB without sample data. On startup, records belonging to the old built-in sample accounts (`jules@pod.local`, `maya@pod.local`, `liam@pod.local`, and `priya@pod.local`) are removed from the member, assignment, and daily-update collections. Other records are left untouched. Daily check-ins are upserted by member and date, and assignments and status changes are written back to AppDB.

This proof of concept uses email-only access for demonstration. For production, enforce identity and role permissions through Domo access controls or a trusted server-side authentication layer, and restrict collection access accordingly.

## Checks

```sh
npm run lint
npm run build
```
## Team hierarchy

Admins manage all people through the team directory. Team leads report to the admin; each team head reports to a lead; each member reports to a head. The directory uses compact rows with reporting-manager, lead, and workload columns. Role filters, team filters, and search narrow the list before pagination (10 people per page by default, optionally 20). Mobile layouts show the same information in compact blocks. Workload is included in each row rather than repeated in a second owner list. Overview summary cards show up to six teams or members per page.

Use Edit on a person’s card to change their full name, job title, work email, role, or reporting manager. Email changes keep the same member record and update direct reports, assignments, and check-in references. Duplicate member and admin emails are rejected. Profile details can be corrected even before an unassigned person has a manager. AppDB email changes involve multiple writes; if saving fails, the app attempts to restore changed references and reports any recovery failure.

Add a person includes Admin-only Domo user search using the supplied DomoApi file's ListAllUsers and GetUser endpoints. Search retrieves paginated `/domo/users/v1?includeDetails=true&limit=100&offset=...` results, then matches names/emails locally. It caches the list in memory for five minutes per admin and searches automatically after a 350 ms typing pause (at least two characters). A single match fills automatically; multiple matches show up to 20 choices. Older responses cannot overwrite a newer query. Lookup fills the primary Domo account email (including detail.email and emailAddress), name, and job title when returned; missing email/name can be retrieved from `/domo/users/v1/{id}?includeDetails=true`. Admin still chooses the POD role and reporting manager and can correct fields before saving. Existing POD members are marked Already added. Users must exist in the Domo instance, and Admin must have user API access. Manual entry remains available if lookup fails or the app is running without a Domo connection. The Dataapi OAuth/token functions are not needed for this feature; no client secret or bearer token is added to the browser app.

Leads see their own heads and those heads’ members. Heads see their own members. Work and check-in records returned to React follow the same scope. Add, assign, and delete operations check the current admin identity. Existing invalid reporting relationships appear under Needs assignment for the admin to repair; they are not automatically rewritten.

Deleting a person removes their membership and application access. Direct reports become unassigned, while assignment and check-in history remains. Changing a role requires reassigning any incompatible direct reports first. Signed-in accounts refresh their role and visible data every 15 seconds and on window focus.

These scope and mutation checks run in the client. They do not replace Domo/AppDB server authorization. Collection permissions or a trusted server must enforce the same rules for production; this repository does not contain that server configuration.

Run the hierarchy and store regression checks with npm test. Tests use isolated memory storage and do not touch live AppDB data.
## Role dashboards and reporting

Admin opens on the all-team overview. Leads and heads open on dedicated team overviews, with separate Team work, Team check-ins, My work, and My team pages. All branch lists are scoped by the signed-in account. Only Admin creates or reassigns tasks and manages people. Admin can select multiple work items to reassign, change status, or delete them. Each assignment also has a Delete action. Deletion requires confirmation, removes the work item, retains daily check-ins, and records activity history. People can be selected across directory pages for deletion or reassignment; reassignment accepts heads or members of the same role. Changing directory filters clears selection. Select this page is available on mobile. People deletion retains their work and check-in history and detaches remaining direct reports. Bulk actions report successes and failures explicitly and retain failed selections for retry; they are not atomic. The sidebar collapses to an icon rail on desktop and remembers the preference. Team pulse opens the directory. The Admin overview provides add-person and overdue-work actions plus completion progress; work-status legend entries open filtered assignments.

Summary cards open matching filtered lists. Work lists filter by lead, head, due date, status, and overdue state. Check-ins filter by team and reporting date, show attendance for a selected date, and list unresolved/escalated blockers. Heads and leads can save follow-up notes, resolve blockers, or escalate them to their reporting lead/admin. Members see these notes on My work and can continue editing their own check-ins. Members cannot write manager follow-up or escalation fields.

My work shows the reporting manager, today's check-in status, overdue/due-today tasks, task details, and blockers. Completed history supports search and completion-date filters. Completed this week means Monday through the current local calendar date; old records without completion dates are excluded from dated metrics. Reopening work clears its completion date. Rolling charts are labeled Last 7 days. Notifications are generated from current scoped overdue tasks, due-today work, blockers, escalations, and missing check-ins; they link to the relevant view.

Admin activity history records recent people/role/assignment changes in the Admin_Login document's activityLog field (up to 500 entries per admin). Existing collections and IDs are reused; the manifest adds activityLog and daily follow-up/escalation columns. Existing events are not backfilled. Activity history is an application record, not an immutable server audit: AppDB read-modify-write operations are not transactional, and concurrent changes can overwrite history entries. A failed history write warns the user without undoing an otherwise successful action.

Production access enforcement remains outside this client-only repository. The Domo collection permissions/trusted service must enforce identity, branch-scoped reads, admin-only people/assignment changes, owner-only task/check-in edits, and scoped blocker follow-up before the app is treated as a secure production portal. Direct AppDB requests are not protected by React filtering. The startup migration/seed now runs only for known admins in Domo. No deployment or server permission changes are performed by these source changes.

Registered Domo leads, heads, and members authenticate from POD_Members without reading Admin_Login or running admin seed/cleanup writes. They still need document read access to POD_Members, POD_WorkItems, and POD_DailyUpdates in the installed app. Collection read failures identify the collection and HTTP status when provided by the SDK: 403 indicates denied document access, 401 an unauthorized session, and 404 requires checking collection wiring (document security can also hide resources). Publishing changed collection mappings requires editing and saving the installed app for those mappings to take effect. Adding a member in this app does not grant Domo/AppDB permissions.
