@without-projects
Feature: Get started with an Agent
  Scenario Outline: Add an Agent from Get started and start a New Session with it
    Given a wide Frame
    And no Agents are installed
    And the fixture Server has no Projects
    When I add Agent "<name>" from Get started
    Then Agent Setup is done
    When the fixture Project is registered
    And I open a New Session
    Then the Agent picker remembers "<name>"

    Examples:
      | name   |
      | Claude |
      | Codex  |
