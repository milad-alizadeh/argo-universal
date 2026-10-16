@web-only
Feature: Feed history pagination
  Scenario Outline: Read stored history and receive another live Turn with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And Agent <agent> supplies a long Feed history
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
      | agent | frame |
      | 1     | wide  |
      | 1     | phone |
      | 2     | wide  |
      | 2     | phone |

  Scenario Outline: Read older history while a reconnect refresh is pending with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And Agent <agent> supplies a long Feed history
    And the Feed history refresh can be delayed
    And a New Session with Agent <agent>
    When I send the prompt "Build a long history"
    And I reopen the stored long Feed
    Then the Feed opens at its newest history message
    When the initial history prefetch finishes at the newest message
    And the Connection reconnects with its history refresh delayed
    And I scroll to the top while the history refresh is delayed
    Then the oldest history message loads before the refresh finishes

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 1     | phone |
      | 2     | wide  |
      | 2     | phone |
