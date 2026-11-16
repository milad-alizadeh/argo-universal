Feature: Steering from the Composer
  Scenario Outline: Cmd+Enter sends a draft directly into the running Turn with Agent <agent>
    Given a <frame> Frame
    And Agent <agent> accepts steering into its held Turn
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I steer the Composer draft "Second prompt" with Cmd+Enter
    Then the steered Prompt joins the running Turn

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 2     | phone |

  Scenario: Rejected steering preserves the draft and existing queue
    Given a wide Frame
    And Agent 1 refuses steering into its held Turn
    And a New Session with Agent 1
    When I send the prompt "First prompt"
    And I send the prompt "Keep queued"
    And I attach the red square image
    And I try to steer the Composer draft "Change course"
    Then failed steering keeps the Composer draft "Change course"
    And the Composer keeps the attached red square image
    And the queued Prompts read "Keep queued"

  Scenario: Unsupported steering explains why and keeps the draft
    Given a wide Frame
    And Agent 1 holds its first Turn until released
    And a New Session with Agent 1
    When I send the prompt "First prompt"
    And I send the prompt "Keep queued"
    And I try to steer the Composer draft "Change course"
    Then unsupported steering keeps the Composer draft "Change course"
    And the queued Prompts read "Keep queued"
    And the queue offers no unsupported steering

  Scenario: Cmd+Enter submits normally in an idle Session
    Given a phone Frame
    And a Session with one completed Turn
    When I steer the Composer draft "Second prompt" with Cmd+Enter
    Then both submitted prompts have separate completed Turns
    And the Agent receives no steering request

  Scenario: Cmd+Enter saves the Queued Prompt being edited
    Given a wide Frame
    And Agent 1 accepts steering into its held Turn
    And a New Session with Agent 1
    When I send the prompt "First prompt"
    And I send the prompt "Second prompt"
    And I begin editing Queued Prompt "Second prompt"
    And I steer the Composer draft "Edited prompt" with Cmd+Enter
    Then the queued Prompts read "Edited prompt"
    And the Agent receives no steering request

  Scenario: Direct steering delivers the original attachment content
    Given a phone Frame
    And Agent 2 accepts steering into its held Turn
    And a New Session with Agent 2
    When I send the prompt "First prompt"
    And I attach the red square image
    And I steer the Composer draft "Second prompt" with Cmd+Enter
    Then the steered Prompt joins the running Turn
    And the Session Feed contains the prompt "Second prompt" with the red square image
    And the steered image reaches the Agent with its original bytes
