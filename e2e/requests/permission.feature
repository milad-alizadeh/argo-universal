@web-only
Feature: Session Permission request
  Scenario Outline: Answer a Permission request with one of the Agent's options
    Given a wide Frame
    And Agent <agent> asks permission to edit README.md
    And a New Session with Agent <agent>
    When I send the prompt "Fix the README"
    Then the Permission request "Edit README.md" opens over the Composer
    When I answer the Permission request with "<option>"
    Then the Agent receives the selected option "<optionId>"
    And the Tool call "Edit README.md" reads "<outcome>"
    And the Agent replies "The shared fixture completed this Turn."
    And the Permission request "Edit README.md" closes and the Composer accepts "Follow-up draft"

    Examples:
      | agent | option | optionId | outcome               |
      | 1     | Allow  | allow    | You allowed this once |
      | 1     | Reject | reject   | You denied            |
      | 2     | Allow  | allow    | You allowed this once |
      | 2     | Reject | reject   | You denied            |
