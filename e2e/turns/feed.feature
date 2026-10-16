Feature: A Session's live Feed
  Scenario Outline: A Turn shows edits and commands from the Agent with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And Agent <agent> supplies edits and commands
    And a New Session with Agent <agent>
    When I send the prompt "Update the greeting"
    Then the Feed shows the edit and command from the completed Turn

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 1     | phone |
      | 2     | wide  |
      | 2     | phone |

  Scenario Outline: The Feed catches up after the Engine restarts with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And Agent <agent> supplies an unfinished command
    And a New Session with Agent <agent>
    When I send the prompt "Run the checks"
    And the command is running in the Feed
    And the Engine restarts
    Then the Feed keeps the prompt and catches up to the stopped command

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 1     | phone |
      | 2     | wide  |
      | 2     | phone |
