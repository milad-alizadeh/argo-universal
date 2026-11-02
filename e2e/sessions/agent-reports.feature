@web-only
Feature: Agent reports
  Scenario Outline: Read earlier reports for one Agent
    Given a wide Frame
    And Agent 1 supplies Agent reports
    And a New Session with Agent 1
    When I send the prompt "<prompt>"
    And I reopen the report Session
    And I open the report reviewer
    Then the reviewer shows recent reports
    When I load all earlier reports
    Then the reviewer shows its oldest report
    When I send the prompt "Update the findings"
    Then the open reviewer shows the revised finding
    When I switch to the other reviewer
    Then the other reviewer shows only its own finding
    When I return to the Agents list
    Then the Agents list shows both reviewers

    Examples:
      | prompt               |
      | Review many findings |
