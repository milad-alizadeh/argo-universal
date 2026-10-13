@web-only
Feature: Feed history pagination
  Scenario Outline: Read stored history and receive another live Turn
    Given Agent <agent> supplies a long Feed history
    And a New Session with Agent <agent>
    When I send the prompt "Build a long history"
    And I reopen the stored long Feed
    Then the Feed opens at its newest history message
    When I scroll the Feed to its oldest message
    Then the Feed shows its oldest history message
    When I return to the newest Feed message
    And I send the prompt "Continue after paging history"
    Then the Feed shows the new live Turn after its stored history

    Examples:
      | agent |
      | 1     |
      | 2     |
