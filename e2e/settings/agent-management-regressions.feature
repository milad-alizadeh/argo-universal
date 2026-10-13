Feature: Agent management review regressions
  Scenario Outline: Catalog refresh keeps an accepted update's release fixed when the <layout> App <recovery>
    Given a <layout> Frame
    When I confirm installing Example Agent
    Then Example Agent installation completes with readiness checked separately
    When the registry offers Example Agent version two
    And I explicitly update Example Agent while its installer is held
    And another App refreshes the catalog to version three
    And the App <recovery> during the accepted update
    Then the update stays in progress
    When the version two installer completes
    Then Example Agent settles with selected version two
    And Example Agent offers the next explicit update

    Examples:
      | layout | recovery |
      | wide   | stays    |
      | phone  | stays    |
      | wide   | reloads  |
      | phone  | reloads  |

  Scenario Outline: A refused custom edit explains ownership and preserves the edits
    Given a <layout> Frame
    And a saved custom Agent "Local ACP"
    And another App keeps a Session with that custom Agent open
    When I save a custom Agent edit while its Session remains open
    Then the custom edit explains that the Agent is in use
    When the other App closes its custom Agent Session
    And I retry saving the custom Agent edit
    Then the custom Agent "Updated ACP" passed its check

    Examples:
      | layout |
      | wide   |
      | phone  |
