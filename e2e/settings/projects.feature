Feature: Projects in Settings
  Scenario Outline: Open the Server's Project from each App layout
    Given a <layout> Frame
    When I open Settings
    Then Settings counts the Server's Projects and Agents
    When I open the Projects
    Then the Projects list names the Server's Project
    When I open the Server's Project
    Then the Project page shows its folder

    Examples:
      | layout |
      | wide   |
      | phone  |
