Feature: Agent sign-in and launch callouts
  Scenario Outline: Configuration launch failure offers Retry before Send in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 exits while fetching configuration
    When I open a New Session
    And I open the configuration picker
    Then the App says the Agent failed to launch
    And the launch failure shows "Agent exited with status 17"
    When I press Retry
    Then the launch callout is gone
    And the Composer shows Agent options
    And configuration discovery has not sent a prompt

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: Configuration asks for sign-in before Send in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 needs sign-in
    When I open a New Session
    And I open the configuration picker
    Then the App asks to authenticate to Agent 1 with "Sign in"
    When I choose the sign-in method "Sign in"
    Then the sign-in callout is gone
    And the Composer shows Agent options
    And configuration discovery has not sent a prompt
    When I send the prompt "Only Send creates my Session"
    Then the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: A Local New Session signs in before Send in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 needs sign-in
    When I open a New Session
    And I open the configuration picker
    Then the App asks to authenticate to Agent 1 with "Sign in"
    When I choose the sign-in method "Sign in"
    Then the sign-in callout is gone
    When I choose the local Checkout
    And I send the prompt "Fix the flaky login test"
    Then the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: A failed sign-in method brings the methods back in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 offers two sign-in methods
    When I open a New Session
    And I open the configuration picker
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
    When I open a New Session
    And I open the configuration picker
    And I choose the sign-in method "Sign in"
    Then the App is authenticating to Agent 1
    When I cancel the sign-in
    Then the App asks to authenticate to Agent 1 with "Sign in"

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: A New worktree signs in before Send in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 needs sign-in
    When I open a New Session
    And I open the configuration picker
    Then the App asks to authenticate to Agent 1 with "Sign in"
    When I choose the sign-in method "Sign in"
    Then the sign-in callout is gone
    When I send the prompt "Fix the flaky login test"
    Then the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: A terminal sign-in method opens its terminal in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 signs in through a terminal
    When I open a New Session
    And I open the configuration picker
    And I choose the sign-in method "Terminal sign-in"
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

  Scenario Outline: A Turn's card stays cleared when its Session page opens again in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 ends its first Turn needing sign-in
    And a Local New Session with Agent 1
    When I send the prompt "Fix the flaky login test"
    Then the Session says authentication is required: "Your subscription sign-in expired."
    When I press Authenticate
    And I choose the sign-in method "Sign in"
    Then the sign-in callout is gone
    When I leave the Session "Fix the flaky login test" and open it again
    Then the sign-in callout is gone

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: A Turn's sign-in clears its card after the Session page opens again mid-sign-in in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 ends its first Turn needing a terminal sign-in
    And a Local New Session with Agent 1
    When I send the prompt "Fix the flaky login test"
    Then the Session says authentication is required: "Your subscription sign-in expired."
    When I press Authenticate
    And I choose the sign-in method "Terminal sign-in"
    Then the sign-in terminal "Terminal sign-in" is open
    When I leave the Session "Fix the flaky login test" and open it again
    Then the sign-in terminal "Terminal sign-in" is open
    When I press Return in the sign-in terminal
    Then the sign-in callout is gone

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: An Agent that fails to launch says why, and Retry opens it in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 exits while opening its first Session
    And a Local New Session with Agent 1
    When I try to send the prompt "Fix the flaky login test"
    Then the App says the Agent failed to launch
    And the launch failure shows "Agent exited with status 17"
    And the launch failure shows "Agent fixture failed"
    When I press Retry
    Then the launch callout is gone
    Then the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame |
      | wide  |
      | phone |

  # A phone's launch sheet covers the Message box, so the draft changes in a wide Frame.
  Scenario: Retry creates a New worktree with the draft as it is at Retry
    Given a wide Frame
    And Agent 1 exits while opening its first Session
    And a New Session with Agent 1
    When I try to send the prompt "First draft"
    Then the App says the Agent failed to launch
    And the Message box still holds "First draft"
    When I change the draft to "Fix the flaky login test"
    And I press Retry
    Then the Agent replies "The shared fixture completed this Turn."
    And the Feed shows "Fix the flaky login test" instead of "First draft"

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
    Then the App says it is reconnecting
    And the App shows no launch failure
    And the App shows no toast
    When the Connection comes back
    And I send the prompt "Second prompt"
    Then both submitted prompts have separate completed Turns

  Scenario Outline: A prompt sent after a failed Local open is delivered once Retry opens it in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 exits while opening its first Session
    And a Local New Session with Agent 1
    When I try to send the prompt "Fix the flaky login test"
    Then the App says the Agent failed to launch
    When I press Retry
    Then the Agent replies "The shared fixture completed this Turn."

    Examples:
      | frame |
      | wide  |
      | phone |
