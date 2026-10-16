@without-projects
Feature: Get started with an Agent
  Scenario Outline: Install a featured Agent and remember it for New Session
    Given a wide Frame
    And no Agents are installed
    And the fixture Server has no Projects
    When I install featured Agent "<name>"
    Then Agent Setup is done
    When the fixture Project is registered
    And I open a New Session
    Then the Agent picker remembers "<name>"

    Examples:
      | name   |
      | Claude |
      | Codex  |
