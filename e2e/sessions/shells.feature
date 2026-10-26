Feature: Shells on live data
  Scenario Outline: The first Shell becomes available with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And Agent <agent> starts a Shell when released
    And a New Session with Agent <agent>
    And a Session waiting for its first Shell
    Then the Session offers no Shells
    When the Agent starts its Shell
    Then the Session offers 1 Shell

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 1     | phone |
      | 2     | wide  |
      | 2     | phone |

  Scenario Outline: Watching live Shell output with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And Agent <agent> starts a Shell when released
    And a New Session with Agent <agent>
    And a running Shell with its output open
    When the Shell prints more output
    Then the Shell output shows "Shell updated"
    And the Shell output shows "Shell ready"

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 1     | phone |
      | 2     | wide  |
      | 2     | phone |

  Scenario Outline: Stopping a Shell with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And Agent <agent> starts a Shell when released
    And a New Session with Agent <agent>
    And a running Shell with its output open
    When I stop the Shell
    Then the Shell output shows its stopped outcome

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 1     | phone |
      | 2     | wide  |
      | 2     | phone |
