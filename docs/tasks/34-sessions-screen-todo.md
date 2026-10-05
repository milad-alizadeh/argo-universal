# Issue 34: Sessions screen checklist

Updated as new requests arrive. Completed entries describe implemented changes; user acceptance is pending. Reviews wait until the PR.

- [x] Implement the completed Paper Sessions screen design.
- [x] Have a sub-agent match the Session list to Paper.
- [x] Have another sub-agent compare the Projects list to Paper.
- [x] Vertically center skeleton circles with their first lines.
- [x] Add top and bottom scroll fades to the LegendList.
- [x] Keep both shared scroll fades fixed in every story; add 20 px top padding and 28 px bottom padding so boundary rows can scroll fully beyond the gradients (replaces fade visibility toggling).
- [x] Keep the list surface opaque: fade only scrolling content into the exact list background color; remove the alpha mask that exposed the white page. Light/dark regression tests confirm the surface has no mask.
- [x] Shorten both fades to 20 px top / 28 px bottom, with matching padding and list surface colors.
- [x] Make On New Session interactive: clicking the Project + inserts a new Session directly; use the existing Project control instead of a separate story button.
- [x] Animate existing list rows shifting when Sessions are inserted or reordered.
- [x] Fix the large row gaps caused by estimated animation offsets; animate the measured list positions instead.
- [x] Give Session rows solid list-colored backgrounds, including dark hover and pressed states, so animated rows cover text beneath them.
- [x] Fix and test the transparent animated row containers: opaque clipped row surfaces; light/dark insertion checked across 12 animation frames and final spacing; six targeted browser tests pass, including first/last row padding, gradient sizes, and gradient color matching in light and dark mode.
- [x] Match hover effects for add Session, Project +, and … controls.
- [x] Remove Project Session counts.
- [x] Disable browser text selection in SessionsList.
- [x] Remove the invalid No registered Agents variation.
- [x] Remove duplicate Sessions, Selected Session ID, and On Select stories.
- [x] Remove On Project Settings from showcase stories; keep callback coverage in test stories because it has no distinct visual state.
- [x] Show archived Sessions and no archived Sessions together; remove the Active comparison.
- [x] Remove the redundant No search variation from Query.
- [x] Fix the blind validation failure: the pagination spinner must be visible on the first scroll to the bottom, without another wheel gesture.
- [x] Keep the bottom scroll fade and pagination spinner visible together on the first loading gesture; independent single-wheel replay passed in light and dark mode.
- [x] Make On End Reached interactive: start with 20 rows, load 20 more after two seconds, stop at 100 rows.
- [x] Add shared Screen with safe-area insets enabled by default and optional safeArea / edges overrides.
- [x] Apply Screen to the Sessions screen.
- [x] Keep web Storybook and iOS Storybook open while working.
- [x] Refresh the web preview with the latest changes.
- [x] Have a sub-agent match SettingsList to the linked Paper design (node 1GEA-0); ten targeted browser tests pass across phone/wide and light/dark.
- [x] Keep one interactive SettingsList showcase story and remove redundant Projects, Agents, and Selected Destination stories.
- [x] Have another sub-agent add a smooth morph animation when the search icon expands into the search field and collapses back. Preserve focus, filtering, clear, Escape, and reduced motion; two focused browser tests pass across phone/wide and light/dark.
- [x] Add one dedicated interactive Search showcase for opening, typing, and collapsing the morphing search control, outside test stories.
- [x] Have a fresh blind sub-agent independently test every requested fix against live previews and report PASS / FAIL / UNVERIFIED with visual evidence and reproducible failures.
- [x] Remove the close control’s hover background while search is expanded; keep the collapsed search trigger hover behavior.
- [x] Rename ProjectsList → SessionsList, ProjectsScreen → SessionsScreen, and ProjectsLoading → SessionsLoading, including files, exports, mocks, story titles, and preview links.
- [x] Match the iOS search field to web: field height, icon/text alignment, placeholder and entered-text typography. Directly verified placeholder and typed-text screenshots in the iPhone Simulator and phone web preview; browser Search / SearchMorph and client typecheck pass.
- [ ] User acceptance of the current changes.
- [x] Update AGENTS.md Storybook rules: distinct valid visual states, no repeated default states or child-component coverage, callback checks without visual effects in test stories, and interactive pagination with enough rows, temporary loading, and appended results. Align the Paper guidance with these rules.
- [x] Clarify AGENTS.md Storybook rules: every screen has a full presentation story; visibly identical stories are duplicates; callback-only cases and assertions belong in test stories; presentation and functionality tests are separate.
- [x] Make child-state ownership explicit: a state already presented by a child, such as a selected row, gets no separate parent story or parent variation.
- [ ] Final review when preparing the PR.

Independent results and native coverage limits: [validation report](34-blind-validation.md).

## Where to see changes

- [Search: dedicated interactive morph showcase](http://localhost:6007/?path=/story/sessions-listsearch--search)

- [SettingsList: single interactive Settings story](http://localhost:6007/?path=/story/settings-settingslist--settings)

- [Sessions list: design, hover controls, text selection, scroll fades](http://localhost:6007/?path=/story/sessions-sessionslist--projects)
- [Query: no matching Sessions](http://localhost:6007/?path=/story/sessions-sessionslist--query)
- [Archived: archived and empty states](http://localhost:6007/?path=/story/sessions-sessionslist--archived)
- [New Session: Project + inserts a row with shift animation](http://localhost:6007/?path=/story/sessions-sessionslist--on-new-session)
- [SessionsLoading: aligned skeletons](http://localhost:6007/?path=/story/sessions-sessionsloading--default)
- [Pagination: scroll, spinner, and appended rows](http://localhost:6007/?path=/story/sessions-sessionslist--on-end-reached)
- [Loading screen: skeleton alignment](http://localhost:6007/?path=/story/screens-sessionsscreen--loading)
- [Loaded screen: safe-area integration](http://localhost:6007/?path=/story/screens-sessionsscreen--loaded)
- [Screen: default safe areas and opt-out](http://localhost:6007/?path=/story/shared-screen--safe-area)
- [Screen: edge overrides](http://localhost:6007/?path=/story/shared-screen--edges)

On iOS, use the same story groups in the open Simulator: Screens → SessionsScreen, Sessions → SessionsList / SessionsLoading, and Shared → Screen.
