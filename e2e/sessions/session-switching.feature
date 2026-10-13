Feature: Session switching
  Scenario: Opening another Session shows its own draft
    Given a wide Frame
    And Sessions named "Plan the release" and "Fix the login test"
    And the draft "Ship on Friday" in the Session "Plan the release"
    And the draft "Retry the flaky step" in the Session "Fix the login test"
    When I open the Session "Plan the release"
    Then the Feed shows "Plan the release" instead of "Fix the login test"
    And the Message box shows "Ship on Friday"
