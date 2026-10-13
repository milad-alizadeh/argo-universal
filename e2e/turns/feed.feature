Feature: A Session's live Feed
  Scenario Outline: A Turn shows edits and commands from the Agent
    Given Agent <agent> supplies edits and commands
    And a New Session with Agent <agent>
    When I send the prompt "Update the greeting"
    Then the Feed shows the edit and command from the completed Turn

    Examples:
      | agent |
      | 1     |
      | 2     |

  Scenario Outline: The Feed catches up after the Engine restarts
    Given Agent <agent> supplies an unfinished command
    And a New Session with Agent <agent>
    When I send the prompt "Run the checks"
    And the command is running in the Feed
    And the Engine restarts
    Then the Feed keeps the prompt and catches up to the stopped command

    Examples:
      | agent |
      | 1     |
      | 2     |
