Feature: Agent catalog
  Scenario Outline: Browse registry Agents from each App layout
    Given a <layout> Frame
    When I browse available Agents
    Then the catalog shows upstream Agent metadata
    When I search the catalog for "python"
    Then only Python Agent is shown in the catalog

    Examples:
      | layout |
      | wide   |
      | phone  |

  Scenario Outline: Keep the last-good catalog after an unavailable refresh
    Given a <layout> Frame
    When I browse available Agents
    And the registry becomes <failure>
    And I refresh the Agent catalog
    Then the catalog keeps the last-good Agents with an explicit error

    Examples:
      | layout | failure   |
      | wide   | offline   |
      | phone  | offline   |
      | wide   | malformed |
      | phone  | malformed |
