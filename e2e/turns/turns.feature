Feature: Turns
  Scenario: A quiet Session resumes on the next prompt
    Given a phone Frame
    And a Session with one completed Turn
    And the Server closes the Session quietly
    When I send the prompt "Second prompt"
    Then both submitted prompts have separate completed Turns
    And no alert is shown

  Scenario: An Agent that exits mid-Turn shows the exit Notice and the next Send resumes
    Given a phone Frame
    And Agent 1 exits mid-Turn with stderr
    When I start a Session with the crashing Agent
    Then the Feed shows the Agent exit status and stderr
    When I send the prompt "Second prompt"
    Then the resumed Agent completes the next Turn

  Scenario Outline: Stop ends the Turn at once and the next Send waits for the Agent with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I stop the Turn
    Then the Composer is ready while the Agent still holds the stopped prompt
    When I send "Second prompt" while the Agent holds the stopped prompt
    Then the Composer holds "Second prompt" until the Agent answers
    When the Agent answers its held prompt
    Then the Agent receives the next prompt only after answering the held one

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 2     | phone |

  Scenario Outline: A model chosen during a Turn applies before the next prompt with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I choose model "Small"
    Then the configuration shows model "Small" and effort "High"
    When the Agent answers its held prompt
    And I send the prompt "Second prompt"
    Then the Agent switches to model "small" before the next prompt
    And the configuration shows model "Small" and effort "High"

    Examples:
      | agent | frame |
      | 1     | phone |
      | 2     | wide  |
