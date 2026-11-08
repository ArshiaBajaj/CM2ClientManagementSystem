# Product boundary

Client management owns households, clients, guardians, consent, matching, sessions, goals, notes, and program data.

Coach roster updates arrive only from onboarding via HMAC-signed `CoachActivated`, `CoachSuspended`, or `CoachDischarged` events.

This app never stores applicant screening files, background-check packets, or onboarding reviewer notes.

After a coach is activated, they still complete the in-app coach forms before the student list opens. Those forms are program agreements, not screening files. Teen interns and their parents sign a separate set of forms before the intern workspace opens.
