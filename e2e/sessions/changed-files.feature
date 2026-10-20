Feature: Changed files on live data
  Scenario Outline: Reviewing an edit before its Turn ends with Agent <agent> in a <frame> Frame with <theme> appearance
    Given the App follows a <theme> system appearance
    And a <frame> Frame
    And the Project has a committed greeting
    And Agent <agent> edits a file and keeps its Turn running
    And a New Session with Agent <agent>
    When I send the prompt "Update the greeting"
    Then the changed-files entry shows 0 files while the Turn runs
    When the Agent edits the greeting
    Then the changed-files entry shows 1 file while the Turn runs
    When I open the changed files
    Then the changed greeting diff opens while the Turn runs
    When I stop the Turn

    Examples:
      | agent | frame | theme |
      | 1     | wide  | light |
      | 1     | phone | light |
      | 2     | wide  | dark  |
      | 2     | phone | dark  |
