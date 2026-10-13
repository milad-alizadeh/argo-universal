Feature: Agent terminal sign-in
  Scenario Outline: Type directly in an owned terminal and verify readiness
    Given a <frame> Frame
    And a saved terminal sign-in Agent "Terminal ACP"
    When I open protocol sign-in for "Terminal ACP"
    And I choose terminal sign-in
    Then the App shows an interactive sign-in terminal
    When I press Return in the sign-in terminal
    Then the App reports the Agent is ready to use

    Examples:
      | frame  |
      | wide   |
      | phone |
