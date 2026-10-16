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
    Then the sign-in says why it failed: "Internal error: The sign-in was refused."
    And the App asks to authenticate to Agent 1 with "Sign in"
    When I choose the sign-in method "Sign in"
    Then the sign-in callout is gone

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: Cancel stops a sign-in and brings the methods back in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 holds its sign-in
    And a Local New Session with Agent 1
    When I choose the sign-in method "Sign in"
    Then the App is authenticating to Agent 1
    When I cancel the sign-in
    Then the App asks to authenticate to Agent 1 with "Sign in"

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

  Scenario Outline: A Turn's terminal sign-in brings the methods back when its terminal closes in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 ends its first Turn needing a terminal sign-in
    And a Local New Session with Agent 1
    When I send the prompt "Fix the flaky login test"
    Then the Session says authentication is required: "Your subscription sign-in expired."
    When I press Authenticate
    And I choose the sign-in method "Terminal sign-in"
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
    When I send the prompt "Fix the flaky login test"
    Then the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: An Agent that fails to launch says why, and Retry opens it in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 exits while opening its first Session
    And a Local New Session with Agent 1
    Then the App says the Agent failed to launch
    And the launch failure shows "Agent exited with status 17"
    And the launch failure shows "Agent fixture failed"
    When I press Retry
    Then the launch callout is gone
    When I send the prompt "Fix the flaky login test"
    Then the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: Retry reopens a past Session whose Agent failed to launch in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 refuses to reopen a Session
    And a New Session with Agent 1
    And I send the prompt "First prompt"
    And the Agent replies "The shared fixture completed this Turn."
    And the Server closes the Session quietly
    When I reload the App and open the Session "First prompt"
    And I try to send the prompt "Second prompt"
    Then the App says the Agent failed to launch
    When I press Retry
    Then the launch callout is gone
    When I send the prompt "Second prompt"
    Then both submitted prompts have separate completed Turns

    Examples:
      | frame |
      | wide  |
      | phone |

  @web-only
  Scenario: A dropped Connection is no launch failure
    Given a phone Frame
    And the App's Connection can be dropped
    And a New Session with Agent 1
    And I send the prompt "First prompt"
    And the Agent replies "The shared fixture completed this Turn."
    When the Connection drops and stays down
    Then the App says it couldn't open the Session
    And the App shows no launch failure
    When the Connection comes back
    And I send the prompt "Second prompt"
    Then both submitted prompts have separate completed Turns

  Scenario Outline: A prompt sent after a failed Local open is delivered once Retry opens it in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 exits while opening its first Session
    And a Local New Session with Agent 1
    Then the App says the Agent failed to launch
    When I put the callout away
    And I try to send the prompt "Fix the flaky login test"
    Then the App says the Agent failed to launch
    When I press Retry
    Then the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame |
      | wide  |
      | phone |
