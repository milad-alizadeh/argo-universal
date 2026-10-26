Feature: Shells on live data
  Scenario Outline: Shell output stays readable during delayed replay with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And Shell output replay can be delayed
    And Agent <agent> starts a Shell when released
    And a New Session with Agent <agent>
    And a running Shell with its output open
    When the Connection reconnects with Shell output replay delayed
    Then the Shell output shows "Shell ready"

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 1     | phone |
      | 2     | wide  |
      | 2     | phone |

  Scenario Outline: Closing Shell output releases its read with Agent <agent> in a <frame> Frame
    Given Shell output reads are observed
    And a <frame> Frame
    And Agent <agent> starts a Shell when released
    And a New Session with Agent <agent>
    And a running Shell with its output open
    Then one Shell output read is open
    When I close the Shell output
    Then no Shell output read remains open

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 1     | phone |
      | 2     | wide  |
      | 2     | phone |

  Scenario Outline: Returning to the Shells list releases its output read with Agent <agent> in a <frame> Frame
    Given Shell output reads are observed
    And a <frame> Frame
    And Agent <agent> starts a Shell when released
    And a New Session with Agent <agent>
    And a running Shell with its output open
    Then one Shell output read is open
    When I return to the Shells list
    Then no Shell output read remains open

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 1     | phone |
      | 2     | wide  |
      | 2     | phone |

  Scenario Outline: Reopening Shell output restores its read with Agent <agent> in a <frame> Frame
    Given Shell output reads are observed
    And a <frame> Frame
    And Agent <agent> starts a Shell when released
    And a New Session with Agent <agent>
    And a running Shell with its output open
    And the Shell output is closed
    When I reopen the Shell output
    Then the Shell output shows "Shell ready"
    And one Shell output read is open

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 1     | phone |
      | 2     | wide  |
      | 2     | phone |

  Scenario Outline: Reconnecting Shell output keeps one read with Agent <agent> in a <frame> Frame
    Given Shell output reads are observed
    And a <frame> Frame
    And the App's Connection can be dropped
    And Agent <agent> starts a Shell when released
    And a New Session with Agent <agent>
    And a running Shell with its output open
    When the Connection drops and comes back
    Then the Shell output shows "Shell ready"
    And one Shell output read is open

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 1     | phone |
      | 2     | wide  |
      | 2     | phone |

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
