Feature: Session switching
  Scenario: Opening another Session starts with its own empty draft
    Given a wide Frame
    And Sessions named "Plan the release" and "Fix the login test"
    And an unsent draft in the Session "Fix the login test"
    When I open the Session "Plan the release"
    Then the Feed shows "Plan the release" instead of "Fix the login test"
    And the Message box is empty
