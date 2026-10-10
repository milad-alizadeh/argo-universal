Feature: Custom Agent
  Scenario: Add a custom Agent and start a Session with it
    Given a wide Frame
    When I browse available Agents
    And I add the scripted Agent as the custom Agent "Scripted ACP"
    Then the custom Agent "Scripted ACP" passed its check
    When I start a New Session with the custom Agent "Scripted ACP"
    And I send the prompt "Hello from a custom Agent"
    Then the Agent replies "The shared fixture completed this Turn."
