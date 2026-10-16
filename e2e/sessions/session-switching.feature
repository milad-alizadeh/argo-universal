Feature: Session switching
  Scenario: Opening another Session shows its own draft
    Given a wide Frame
    And Sessions named "Plan the release" and "Fix the login test"
    And the draft "Ship on Friday" in the Session "Plan the release"
    And the draft "Retry the flaky step" in the Session "Fix the login test"
    When I open the Session "Plan the release"
    Then the Feed shows "Plan the release" instead of "Fix the login test"
    And the Message box shows "Ship on Friday"

  Scenario: Leaving a Session closes its configuration and retains its draft
    Given a Session named "Plan the release"
    And the draft "Ship on Friday" in the Session "Plan the release"
    When I leave an open Agent and model for Settings
    Then no Agent and model overlay is shown
    When I return to Sessions
    And I open the Session "Plan the release"
    Then the Message box shows "Ship on Friday"
    And no Agent and model overlay is shown
