Feature: GitHub Issue Tracker
  Scenario Outline: Choose a Project Tracker and open an Issue on <frame> Frame
    Given a wide Frame
    And the Server Project has a GitHub origin
    When I open Settings
    And I open the Projects
    And I open the Server Project
    When I choose GitHub Issues
    When I open the Issues Plugin
    And I resize to a <frame> Frame
    Then the Issues page shows the fixture Issue
    When I open the fixture Issue
    Then the Issue page shows its description
    And the Issue view fits in the viewport

    Examples:
      | frame |
      | wide  |
      | phone |
