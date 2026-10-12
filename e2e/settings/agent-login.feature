Feature: Agent protocol sign-in
  Scenario Outline: Complete protocol sign-in and use the Agent in a normal Session
    Given a <frame> Frame
    And a saved protocol sign-in Agent "<agent>"
    When I open protocol sign-in for "<agent>"
    And I choose the Agent's subscription sign-in method
    Then the App shows the Agent's device code instructions
    When I finish the Agent's browser sign-in
    Then the App reports the Agent is ready to use
    When I start a New Session with the custom Agent "<agent>"
    And I send the prompt "Hello after sign-in"
    Then the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame | agent     |
      | wide  | Login ACP |
