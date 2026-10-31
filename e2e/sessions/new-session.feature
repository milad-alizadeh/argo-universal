Feature: New Session
  Scenario Outline: Model and effort persist through creation and App restart with Agent <agent>
    Given a phone Frame
    And a Local New Session with Agent <agent>
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
    And a Local New Session with Agent <agent>
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

  @smoke
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

  Scenario Outline: A refused Local Session says the Agent failed to launch with Agent <agent>
    Given a phone Frame
    And Agent <agent> refuses to open a Session
    And a Local New Session with Agent <agent>
    When I try to send the prompt "Start this Session"
    Then the App says the Agent failed to launch
    And the launch failure shows "The Agent refused the Session."

    Examples:
      | agent |
      | 1     |
      | 2     |

  Scenario: Leaving New Session without sending creates no Session
    Given a phone Frame
    And a Local New Session with Agent 1
    Then no Session or worktree exists yet
    When I return to the Sessions list
    Then no Session is listed

  Scenario: Choosing another Agent discovers options without creating a Session
    Given a phone Frame
    And a Local New Session with Agent 1
    When I choose Agent 2
    Then no Session or worktree exists yet

  @web-only
  Scenario: A lost Connection keeps unsent configuration
    Given a phone Frame
    And the App's Connection can be dropped
    And a Local New Session with Agent 1
    When I choose model "Small" and effort "High"
    And the Connection drops and comes back
    Then the configuration shows model "Small" and effort "High"
    When I send the prompt "Fix the flaky login test"
    Then the Agent replies "The shared fixture completed this Turn."
    And the configuration shows model "Small" and effort "High"

  Scenario: Options from an earlier Session show at once after a reload
    Given a phone Frame
    And a Local New Session with Agent 1
    When I choose model "Small" and effort "High"
    And I send the prompt "Use my configured Session"
    Then the Agent replies "The shared fixture completed this Turn."
    When I watch for New Session's Loading
    And I reload the App and open New Session with Agent 1
    Then the configuration shows model "Small" and effort "High"
    And New Session never showed Loading

  Scenario: A New worktree Session is created only at Send
    Given a phone Frame
    And a New Session with Agent 1
    Then no Session or worktree exists yet
    When I send the prompt "Fix the flaky login test"
    Then the Agent replies "The shared fixture completed this Turn."
    And the Agent opened one Session in a new worktree

  Scenario Outline: A New worktree offers the options of an Agent this Device never opened, with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And a New Session with Agent <agent>
    When I choose model "Small" and effort "Low"
    And I send the prompt "Use my configured Session"
    Then the Agent replies "The shared fixture completed this Turn."
    And the configuration shows model "Small" and effort "Low"

    Examples:
      | agent | frame |
      | 1     | phone |
      | 2     | wide  |

  Scenario: The Checkout choice is remembered
    Given a phone Frame
    And a New Session
    When I choose the local Checkout
    And I send the prompt "Tidy the README"
    Then the next New Session remembers the local Checkout


  Scenario Outline: Zero installed Agents keep the draft when Add Agents opens Settings
    Given a <layout> Frame
    And no Agents are installed
    When I open a New Session
    Then the Agent picker offers only Add Agents and Send is disabled
    When I type "Keep this draft" and open Add Agents
    Then the Agents page is open
    When I return to New Session
    Then the Message box still holds "Keep this draft"

    Examples:
      | layout |
      | wide   |
      | phone  |

  Scenario: Back from the Agents page opened through Add Agents returns to New Session
    Given a phone Frame
    And no Agents are installed
    When I open a New Session
    And I type "Keep this draft" and open Add Agents
    Then the Agents page is open
    When I press Back in the page header
    Then New Session is open
    And the Message box still holds "Keep this draft"
    When I press Back in the page header
    And I open Settings
    Then the phone Frame shows the Settings list without Accounts detail

  Scenario Outline: A first launch waits for the download and then shows options
    Given a <layout> Frame
    And the Agent download is held
    When I open a New Session
    And I choose the local Checkout
    Then the first launch shows Loading
    When the Agent download finishes
    Then the Composer shows Agent options

    Examples:
      | layout |
      | wide   |
      | phone  |

  Scenario: An existing Session restores its model configuration after the Engine restarts
    Given a wide Frame
    And a New Session with Agent 1
    When I choose model "Small" and effort "Low"
    And I send the prompt "Remember this Session configuration"
    Then the Agent replies "The shared fixture completed this Turn."
    When the Engine restarts
    And I reload the App and open the Session "Remember this Session configuration"
    Then the configuration shows model "Small" and effort "Low"

  Scenario: Changing effort keeps the configuration visible and focused
    Given a wide Frame
    And a New Session with Agent 1
    When I adjust effort without the configuration disappearing

  Scenario: Changing effort in an existing Session keeps configuration focused
    Given a wide Frame
    And a New Session with Agent 1
    When I send the prompt "Keep configuration open"
    Then the Agent replies "The shared fixture completed this Turn."
    When I adjust effort without the configuration disappearing
