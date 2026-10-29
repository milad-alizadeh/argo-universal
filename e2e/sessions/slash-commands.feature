Feature: Slash commands in New Session
  @smoke
  Scenario: Choose the Agent's Slash command before the first Send
    Given a wide Frame
    And Agent 1 offers the review Slash command
    And a New Session with Agent 1
    When I open the Slash command menu
    And I choose the Slash command "review"
    And I type "src" in the Message box
    And I send the typed prompt with Return
    Then the Session Feed contains the text prompt "/review src"

  Scenario: Another Agent offers its own Slash commands
    Given a wide Frame
    And Agent 1 offers the review Slash command
    And Agent 2 offers the deploy Slash command
    And a New Session with Agent 1
    When I open the Slash command menu
    Then the Slash command menu offers "review" and not "deploy"
    When I clear the Message box
    And I change the Agent to Agent 2
    And I open the Slash command menu
    Then the Slash command menu offers "deploy" and not "review"
