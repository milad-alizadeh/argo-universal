Feature: Frame motion
  Scenario: Opening a Plugin whose page holds the sidebar leaves the list where it is
    Given a wide Frame
    When I watch the Frame panes
    And I open the Issues Plugin
    Then the Plugin page says "Select an Issue"
    And the Frame sidebar never moved

  Scenario: Opening another Session shows it in the Feed without moving or fading the Frame
    Given a wide Frame
    And Sessions named "Plan the release" and "Fix the login test"
    When I open the Session "Plan the release"
    And I watch the Frame panes
    And I open the Session "Fix the login test"
    Then the Feed shows "Fix the login test" instead of "Plan the release"
    And the Frame panes never moved
    And the Feed never moved
    And the page pane faded for at most one frame
