# POD workroom

A POD team portal with separate admin and member workspaces. Members submit one daily check-in per date with Date, Name, Yesterday's Activity, Today's Activity, Blockers, and Solved / Not status. Admins review those reports and unresolved blockers alongside the separate assignment queue.

## Run locally

```sh
npm install
npm run dev
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

Admins manage all people through the team directory. Team leads report to the admin; each team head reports to a lead; each member reports to a head. The overview and directory generate cards for every lead and head. Search retains the matching person’s reporting context, and each team can be collapsed.

Use Edit on a person’s card to change their full name, job title, work email, role, or reporting manager. Email changes keep the same member record and update direct reports, assignments, and check-in references. Duplicate member and admin emails are rejected. Profile details can be corrected even before an unassigned person has a manager. AppDB email changes involve multiple writes; if saving fails, the app attempts to restore changed references and reports any recovery failure.

Leads see their own heads and those heads’ members. Heads see their own members. Work and check-in records returned to React follow the same scope. Add, assign, and delete operations check the current admin identity. Existing invalid reporting relationships appear under Needs assignment for the admin to repair; they are not automatically rewritten.

Deleting a person removes their membership and application access. Direct reports become unassigned, while assignment and check-in history remains. Changing a role requires reassigning any incompatible direct reports first. Signed-in accounts refresh their role and visible data every 15 seconds and on window focus.

These scope and mutation checks run in the client. They do not replace Domo/AppDB server authorization. Collection permissions or a trusted server must enforce the same rules for production; this repository does not contain that server configuration.

Run the hierarchy and store regression checks with npm test. Tests use isolated memory storage and do not touch live AppDB data.
