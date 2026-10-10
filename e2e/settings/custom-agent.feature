Feature: Custom Agent
  Scenario: Start a Session with a new custom Agent
    Given a wide Frame
    When I browse available Agents
    And I add the scripted Agent as the custom Agent "Scripted ACP"
    Then the custom Agent "Scripted ACP" passed its check
    When I start a New Session with the custom Agent "Scripted ACP"
    And I send the prompt "Hello from a custom Agent"
    Then the Agent replies "The shared fixture completed this Turn."

  Scenario: Rename a saved custom Agent
    Given a wide Frame
    And a saved custom Agent "Scripted ACP"
    When I open the custom Agent "Scripted ACP" from the Agents list
    And I rename the custom Agent to "Renamed ACP"
    Then the custom Agent "Renamed ACP" passed its check
