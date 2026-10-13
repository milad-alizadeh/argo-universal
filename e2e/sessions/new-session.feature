Feature: New Session
  Scenario Outline: Model and effort persist through creation and App restart with Agent <agent>
    Given a phone Frame
    And a New Session with Agent <agent>
    When I choose model "Small" and effort "High"
    And I send the prompt "Use my configured Session"
    Then the Agent replies "The shared fixture completed this Turn."
    And the configuration shows model "Small" and effort "High"
    When I choose model "Large" and effort "Low"
    And I return to the Sessions list
    And I open another New Session with Agent <agent>
    Then the configuration shows model "Large" and effort "Low"
    When I reload the App and open New Session with Agent <agent>
    Then the configuration shows model "Large" and effort "Low"
    When I send the prompt "Use my configured Session"
    Then the Agent replies "The shared fixture completed this Turn."
    And the configuration shows model "Large" and effort "Low"

    Examples:
      | agent |
      | 1     |
      | 2     |

  Scenario Outline: Configure the actual Session before its first prompt with Agent <agent>
    Given a phone Frame
    And a New Session with Agent <agent>
    When I enable Fast mode
    And I send the prompt "Use my configured Session"
    Then the Agent replies "The shared fixture completed this Turn."
    And Fast mode remains enabled

    Examples:
      | agent |
      | 1     |
      | 2     |

  Scenario Outline: A text prompt turns New Session into its Session in place with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And a New Session with Agent <agent>
    When I send the first prompt "Fix the flaky login test"
    Then New Session became that Session in place with the prompt shown throughout
    And the Session Feed contains the text prompt "Fix the flaky login test"
    And the Agent replies "The shared fixture completed this Turn."
    And Back returns to the Sessions list

    Examples:
      | agent | frame |
      | 1     | phone |
      | 2     | phone |
      | 1     | wide  |
      | 2     | wide  |

  Scenario Outline: Successive prompts share one ACP Session with Agent <agent>
    Given a phone Frame
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    Then the Agent replies "The shared fixture completed this Turn."
    When I send the prompt "Second prompt"
    Then both submitted prompts have separate completed Turns

    Examples:
      | agent |
      | 1     |
      | 2     |

  Scenario Outline: A prompt with the <attachment> starts a Session with Agent <agent>
    Given a phone Frame
    And a New Session with Agent <agent>
    When I attach the <attachment>
    And I send the prompt "<prompt>"
    Then the Session Feed contains the prompt "<prompt>" with the <attachment>
    And the Agent replies "<reply>"
    And the Server preserves the attached <attachment>

    Examples:
      | agent | attachment         | prompt                                  | reply                              |
      | 1     | red square image   | Name the dominant color in this image.  | The dominant color is red.         |
      | 2     | red square image   | Name the dominant color in this image.  | The dominant color is red.         |
      | 1     | release notes file | Summarise these release notes.          | The release notes list one change. |
      | 2     | release notes file | Summarise these release notes.          | The release notes list one change. |

  Scenario Outline: A refused Session keeps the first prompt with Agent <agent>
    Given a phone Frame
    And Agent <agent> refuses to open a Session
    And a New Session with Agent <agent>
    Then New Session says the Session couldn't open
    When I try to send the prompt "Fix the flaky login test"
    Then New Session says the Session couldn't open
    And the Composer keeps the prompt "Fix the flaky login test"

    Examples:
      | agent |
      | 1     |
      | 2     |

  Scenario: Leaving New Session without sending discards its empty Session
    Given a phone Frame
    And a New Session with Agent 1
    When the empty Session is open
    And I return to the Sessions list
    Then the Agent closed the empty Session
    And the empty Session left no worktree or branch
    And no Session is listed

  Scenario: Choosing another Agent closes the previous empty Session
    Given a phone Frame
    And a New Session with Agent 1
    When the empty Session is open
    And I choose Agent 2
    Then the Agent closed the empty Session
    And only the new empty Session remains

  @web-only
  Scenario: A lost Connection keeps the empty Session
    Given a phone Frame
    And the App's Connection can be dropped
    And a New Session with Agent 1
    When the empty Session is open
    And the Connection drops and comes back
    And I send the prompt "Fix the flaky login test"
    Then the prompt went to the Session opened before the drop
    And the Agent closed no Session

  Scenario: The Checkout choice is remembered
    Given a phone Frame
    And a New Session
    When I choose the local Checkout
    And I send the prompt "Tidy the README"
    Then the next New Session remembers the local Checkout

  Scenario Outline: New Session explains why every Agent is <state>
    Given a phone Frame
    And every Agent is "<state>"
    When I open a New Session
    Then New Session shows the first Agent's setup step
    And New Session cannot send a prompt

    Examples:
      | state         |
      | not installed |
      | not signed in |

  Scenario Outline: Agent <agent> requires setup because it is <state>
    Given a phone Frame
    And Agent <agent> is "<state>"
    When I view the Agent choices in New Session
    Then Agent <agent> shows "<state>" instead of accepting a prompt
    When I set up Agent <agent>
    Then the Settings show Agent <agent>

    Examples:
      | agent | state         |
      | 1     | not installed |
      | 1     | not signed in |
      | 2     | not installed |
      | 2     | not signed in |
