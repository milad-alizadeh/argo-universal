Feature: Safe Agent management
  Scenario Outline: Refresh offers an explicit update and preserves the selected release after failure
    Given a <layout> Frame
    When I confirm installing Example Agent
    Then Example Agent installation completes with readiness checked separately
    When the registry offers Example Agent version two
    Then Example Agent still shows selected version one
    When I explicitly update Example Agent with installer <outcome>
    Then Example Agent settles with selected version <version>

    Examples:
      | layout | outcome | version |
      | wide   | success | two     |
      | phone  | success | two     |
      | wide   | failure | one     |
      | phone  | failure | one     |

  Scenario Outline: Cancel and then confirm removing a managed installation
    Given a <layout> Frame
    When I confirm installing Example Agent
    Then Example Agent installation completes with readiness checked separately
    When I request removing "Example Agent"
    Then removing "Example Agent" asks before changing the Server
    When I cancel removing the Agent
    Then the Agent remains installed
    When I request removing "Example Agent"
    And I confirm removing the Agent
    Then Example Agent is offered as not installed

    Examples:
      | layout |
      | wide   |
      | phone  |

  Scenario Outline: Remove a custom Agent from the configured choices
    Given a <layout> Frame
    And a saved custom Agent "Local ACP"
    When I request removing "Local ACP"
    Then the custom removal explains that the external program stays untouched
    When I confirm removing the Agent
    Then "Local ACP" is absent from the configured Agent choices

    Examples:
      | layout |
      | wide   |
      | phone  |

  @web-only
  Scenario Outline: Two Apps observe the same enablement and removal
    Given a <layout> Frame
    When I confirm installing Example Agent
    Then Example Agent installation completes with readiness checked separately
    When another App observes disablement and removal of Example Agent

    Examples:
      | layout |
      | wide   |
      | phone  |
