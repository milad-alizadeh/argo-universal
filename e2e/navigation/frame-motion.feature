Feature: Frame motion
  Scenario: Opening a Plugin whose page holds the sidebar leaves the list where it is
    Given a wide Frame
    When I watch the Frame panes
    And I open the Issues Plugin
    Then the Plugin page says "Select an Issue"
    And the Frame sidebar never moved

  Scenario: Opening another Session shows it in the Feed
    Given a wide Frame
    And Sessions named "Plan the release" and "Fix the login test"
    When I open the Session "Plan the release"
    And I open the Session "Fix the login test"
    Then the Feed shows "Fix the login test" instead of "Plan the release"

  Scenario: Opening another Session leaves the Frame's panes where they are
    Given a wide Frame
    And Sessions named "Plan the release" and "Fix the login test"
    When I open the Session "Plan the release"
    And I watch the Frame panes
    And I open the Session "Fix the login test"
    Then the Frame panes never moved
    And the Feed never moved

  Scenario: Opening another Session fades the page for no more than one frame
    Given a wide Frame
    And Sessions named "Plan the release" and "Fix the login test"
    When I open the Session "Plan the release"
    And I watch the Frame panes
    And I open the Session "Fix the login test"
    Then the page pane faded for at most one frame
