Feature: Registry Agents
  Scenario Outline: Browse and filter every Registry Agent
    Given a <layout> Frame
    When I browse available Agents
    Then the Registry cards show names, versions and descriptions
    And Python Agent is unavailable on this platform
    When I search the catalog for "python"
    Then only Python Agent is shown in the catalog

    Examples:
      | layout |
      | wide   |
      | phone  |

  Scenario Outline: Keep the stored Registry while offline
    Given a <layout> Frame
    When I browse available Agents
    And the registry becomes offline
    And I open the Agents page again
    Then the catalog keeps the last-good Agents without an error

    Examples:
      | layout |
      | wide   |
      | phone  |

  @registry-offline
  Scenario Outline: Retry a Registry failure with nothing stored
    Given a <layout> Frame
    And the Registry has never been stored and is offline
    When I browse available Agents
    Then the Registry shows its friendly error and Retry
    When the Registry connection returns and I retry
    Then the Registry cards show names, versions and descriptions

    Examples:
      | layout |
      | wide   |
      | phone  |
