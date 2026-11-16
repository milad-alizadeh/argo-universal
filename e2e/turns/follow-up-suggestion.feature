Feature: Follow-up suggestions
  Scenario: A finished Turn offers the next Prompt in the Composer
    Given a wide Frame
    And Agent 1 predicts the next Prompt
    And a New Session with Agent 1
    When I send the prompt "Fix the failing test"
    Then the Composer offers the suggestion "Run the smoke suite"
