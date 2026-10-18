Feature: GitHub Issue Tracker
  Scenario: Choose a Project Tracker and open an Issue
    Given a wide Frame
    And the Server Project has a GitHub origin
    When I open Settings
    And I open the Projects
    And I open the Server Project
    When I choose GitHub Issues
    When I open the Issues Plugin
    Then the Issues page shows the fixture Issue
    When I open the fixture Issue
    Then the Issue page shows its description

  Scenario: Browse and open an Issue in a phone Frame
    Given a wide Frame
    And the Server Project has a GitHub origin
    When I open Settings
    And I open the Projects
    And I open the Server Project
    When I choose GitHub Issues
    When I open the Issues Plugin
    And I resize to a phone Frame
    Then the Issues page shows the fixture Issue
    When I open the fixture Issue
    Then the Issue page shows its description
    And the Issue actions fit in the phone Frame
