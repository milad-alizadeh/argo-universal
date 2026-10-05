# Issue 34: Sessions screen checklist

Updated as new requests arrive. Completed entries describe implemented changes; user acceptance is pending. Reviews wait until the PR.

- [x] Implement the completed Paper Sessions screen design.
- [x] Have a sub-agent match the Session list to Paper.
- [x] Have another sub-agent compare the Projects list to Paper.
- [x] Vertically center skeleton circles with their first lines.
- [x] Add top and bottom scroll fades to the LegendList.
- [x] Animate fade visibility changes rather than snapping (180 ms).
- [x] Match hover effects for add Session, Project +, and … controls.
- [x] Remove Project Session counts.
- [x] Disable browser text selection in the Projects list.
- [x] Remove the invalid No registered Agents variation.
- [x] Remove duplicate Sessions, Selected Session ID, and On Select stories.
- [x] Show archived Sessions and no archived Sessions together; remove the Active comparison.
- [x] Remove the redundant No search variation from Query.
- [x] Show a spinner while the next page loads.
- [x] Keep the bottom scroll fade visible during pagination loading, with footer space to show the spinner and fade together.
- [x] Make On End Reached interactive: start with 20 rows, load 20 more after two seconds, stop at 100 rows.
- [x] Add shared Screen with safe-area insets enabled by default and optional safeArea / edges overrides.
- [x] Apply Screen to the Sessions screen.
- [x] Keep web Storybook and iOS Storybook open while working.
- [x] Refresh the web preview with the latest changes.
- [ ] User acceptance of the current changes.
- [ ] At the end, update AGENTS.md Storybook rules: distinct valid visual states, no repeated default states or child-component coverage, callback checks in test stories, and interactive pagination with enough rows, temporary loading, and appended results.
- [ ] Final review when preparing the PR.

## Where to see changes

- [Projects list: design, hover controls, text selection, scroll fades](http://localhost:6007/?path=/story/sessions-projectslist--projects)
- [Query: no matching Sessions](http://localhost:6007/?path=/story/sessions-projectslist--query)
- [Archived: archived and empty states](http://localhost:6007/?path=/story/sessions-projectslist--archived)
- [Pagination: scroll, spinner, and appended rows](http://localhost:6007/?path=/story/sessions-projectslist--on-end-reached)
- [Loading screen: skeleton alignment](http://localhost:6007/?path=/story/screens-projectsscreen--loading)
- [Loaded screen: safe-area integration](http://localhost:6007/?path=/story/screens-projectsscreen--loaded)
- [Screen: default safe areas and opt-out](http://localhost:6007/?path=/story/shared-screen--safe-area)
- [Screen: edge overrides](http://localhost:6007/?path=/story/shared-screen--edges)

On iOS, use the same story groups in the open Simulator: Screens → ProjectsScreen, Sessions → ProjectsList, and Shared → Screen.
