Feature: Session switching
  Scenario: Opening another Session shows its own draft
    Given a wide Frame
    And Sessions named "Plan the release" and "Fix the login test"
    And the draft "Ship on Friday" in the Session "Plan the release"
    And the draft "Retry the flaky step" in the Session "Fix the login test"
    When I open the Session "Plan the release"
    Then the Feed shows "Plan the release" instead of "Fix the login test"
    And the Message box shows "Ship on Friday"

  Scenario: Returning to a Session leaves its Agent and model closed
    Given a Session named "Plan the release"
    And I left an open Agent and model for Settings
    When I return to the Session "Plan the release"
    Then no Agent and model overlay is shown

  Scenario: Returning from Settings shows a Session's draft
    Given a Session named "Plan the release"
    And the draft "Ship on Friday" in the Session "Plan the release"
    And I left an open Agent and model for Settings
    When I return to the Session "Plan the release"
    Then the Message box shows "Ship on Friday"
