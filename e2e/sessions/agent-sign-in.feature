Feature: Agent sign-in and launch callouts
  Scenario Outline: A Local New Session signs in when it opens in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 needs sign-in
    And a Local New Session with Agent 1
    Then the App asks to authenticate to Agent 1 with "Sign in"
    When I choose the sign-in method "Sign in"
    Then the sign-in callout is gone
    When I send the prompt "Fix the flaky login test"
    Then the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: A failed sign-in method brings the methods back in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 offers two sign-in methods
    And a Local New Session with Agent 1
    Then the App offers the sign-in methods "Sign in" then "Use an API key"
    When I choose the sign-in method "Sign in"
    Then the App offers the sign-in methods "Sign in" then "Use an API key"
    When I choose the sign-in method "Sign in"
    Then the sign-in callout is gone

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: A New worktree asks to sign in at Send and keeps the prompt in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 needs sign-in
    And a New Session with Agent 1
    When I try to send the prompt "Fix the flaky login test"
    Then the App asks to authenticate to Agent 1 with "Sign in"
    And the Message box still holds "Fix the flaky login test"
    When I choose the sign-in method "Sign in"
    Then the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: A terminal sign-in method opens its terminal in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 signs in through a terminal
    And a Local New Session with Agent 1
    When I choose the sign-in method "Terminal sign-in"
    Then the sign-in terminal "Terminal sign-in" is open
    When I close the sign-in terminal
    Then the App asks to authenticate to Agent 1 with "Terminal sign-in"

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: A Turn that needs sign-in asks for it, then the prompt can be resent in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 ends its first Turn needing sign-in
    And a Local New Session with Agent 1
    When I send the prompt "Fix the flaky login test"
    Then the Session says authentication is required: "Your subscription sign-in expired."
    When I press Authenticate
    Then the App asks to authenticate to Agent 1 with "Sign in"
    When I choose the sign-in method "Sign in"
    Then the sign-in callout is gone
    When I send "Fix the flaky login test" in the Session
    Then the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: An Agent that fails to launch says why, and Retry opens it in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 exits while opening its first Session
    And a Local New Session with Agent 1
    Then the App says the Agent failed to launch: "Agent exited with status 17"
    And the launch failure shows "Agent fixture failed"
    When I press Retry
    Then the launch callout is gone
    When I send the prompt "Fix the flaky login test"
    Then the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario: A prompt sent after a failed Local open is delivered once Retry opens it
    Given a wide Frame
    And Agent 1 exits while opening its first Session
    And a Local New Session with Agent 1
    Then the App says the Agent failed to launch: "Agent exited with status 17"
    When I try to send the prompt "Fix the flaky login test"
    And I press Retry
    Then the Agent replies "The shared fixture completed this Turn."
