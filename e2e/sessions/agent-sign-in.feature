Feature: Agent sign-in
  The Engine's auth integration tests (packages/engine/src/agents/auth) cover the failed, cancelled, terminal and
  launch-failure paths; this keeps the one path a person takes through the App.

  Scenario: Configuration asks for sign-in before Send
    Given a wide Frame
    And Agent 1 needs sign-in
    When I open a New Session
    And I open the configuration picker
    Then the App asks to authenticate to Agent 1 with "Sign in"
    When I choose the sign-in method "Sign in"
    Then the sign-in callout is gone
    And the Composer shows Agent options
    And configuration discovery has not sent a prompt
    When I send the prompt "Only Send creates my Session"
    Then the Agent replies "The shared fixture completed this Turn."
