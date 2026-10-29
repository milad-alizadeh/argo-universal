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


  Scenario Outline: Inspect command details before answering a live Permission request
    Given a <frame> Frame
    And Agent <agent> asks permission to run a command
    And a New Session with Agent <agent>
    When I send the prompt "Run the permission preview command"
    Then the Permission request "Run command" opens over the Composer
    And the Permission request shows command "printf 'ARGO_PERMISSION_BODY'"
    When I answer the Permission request with "<option>"
    Then the Agent receives the selected option "<optionId>"
    And the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame | agent | option | optionId |
      | wide  | 1     | Allow  | allow    |
      | wide  | 2     | Reject | reject   |
      | phone | 1     | Reject | reject   |
      | phone | 2     | Allow  | allow    |


  Scenario: Keep delayed Permission command details after reconnecting the App
    Given a wide Frame
    And Agent 1 asks permission before its command details arrive
    And a New Session with Agent 1
    When I send the prompt "Wait for command details"
    Then the Permission request "Run command" opens over the Composer
    And the Permission request has no command details yet
    When the Agent sends the delayed command details
    Then the Permission request shows command "printf 'ARGO_PERMISSION_BODY'"
    When I reload the App and open the Session "Wait for command details"
    Then the Permission request "Run command" opens over the Composer
    And the Permission request shows command "printf 'ARGO_PERMISSION_BODY'"
    When I answer the Permission request with "Reject"
    Then the Agent receives the selected option "reject"
