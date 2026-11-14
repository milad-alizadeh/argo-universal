Feature: Turns
  Scenario: A quiet Session resumes on the next prompt
    Given a phone Frame
    And a Session with one completed Turn
    And the Server closes the Session quietly
    When I send the prompt "Second prompt"
    Then both submitted prompts have separate completed Turns
    And no alert is shown

  Scenario: An Agent that exits mid-Turn shows the exit Notice and the next Send resumes
    Given a phone Frame
    And Agent 1 exits mid-Turn with stderr
    When I start a Session with the crashing Agent
    Then the Feed shows the Agent exit status and stderr
    When I send the prompt "Second prompt"
    Then the resumed Agent completes the next Turn

  Scenario Outline: Stop ends the Turn at once and the next Send waits for the Agent with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I stop the Turn
    Then the Composer is ready while the Agent still holds the stopped prompt
    When I try to send the prompt "Second prompt"
    Then the Composer queues "Second prompt" until the Agent answers
    When the Agent answers its held prompt
    Then the Agent receives the next prompt only after answering the held one

    Examples:
      | agent | frame |
      | 1     | wide  |
      | 2     | phone |

  Scenario Outline: A model chosen during a Turn applies before the next prompt with Agent <agent> in a <frame> Frame
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I choose model "Small"
    Then the configuration shows model "Small" and effort "High"
    When the Agent answers its held prompt
    And I send the prompt "Second prompt"
    Then the Agent switches to model "small" before the next prompt
    And the configuration shows model "Small" and effort "High"

    Examples:
      | agent | frame |
      | 1     | phone |
      | 2     | wide  |

  Scenario Outline: Queued Prompts wait for the current Turn in a <frame> Frame
    Given a <frame> Frame
    And Agent 1 holds its first Turn until released
    And a New Session with Agent 1
    When I send the prompt "First prompt"
    And I send the prompt "Second prompt"
    Then "Second prompt" is queued above the Composer
    And the Agent has received only the first Prompt
    When the Agent answers its held prompt
    Then the queued Prompt starts a separate completed Turn

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: Editing, cancelling, reordering and deleting Queued Prompts preserves a separate Composer draft
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I send the prompt "Second prompt"
    And I send the prompt "Third prompt"
    And I send the prompt "Obsolete prompt"
    And I change the draft to "Separate draft"
    And I cancel editing Queued Prompt "Second prompt" after writing "Discarded edit"
    Then the Message box shows "Separate draft"
    When I edit Queued Prompt "Second prompt" to "Edited prompt" and save
    And I move Queued Prompt "Third prompt" up
    And I delete Queued Prompt "Obsolete prompt"
    Then the queued Prompts read "Third prompt|Edited prompt"
    And the Message box shows "Separate draft"
    When the Agent answers its held prompt
    Then the Feed has completed Prompts in order "First prompt|Third prompt|Edited prompt"
    And the Message box shows "Separate draft"

    Examples:
      | frame | agent |
      | phone  | 2     |

  Scenario Outline: An edit holds the first Queued Prompt after normal completion
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I send the prompt "Second prompt"
    And I begin editing Queued Prompt "Second prompt"
    And the Agent answers its held prompt
    Then editing keeps the queue waiting after completion
    When I cancel the queue edit
    Then the queued Prompt starts a separate completed Turn

    Examples:
      | frame | agent |
      | wide  | 1     |

  Scenario Outline: Stop pauses the queue and Resume waits for the cancelled request
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I send the prompt "Second prompt"
    And I stop the Turn
    Then the queue is paused because "Turn stopped"
    When I send the prompt "Third prompt"
    Then the queue is paused because "Turn stopped"
    And the Agent has received only the first Prompt
    When I resume the queue
    Then the Agent has received only the first Prompt
    When the Agent answers its held prompt
    Then the Feed has completed Prompts in order "First prompt|Second prompt|Third prompt"

    Examples:
      | frame | agent |
      | phone  | 1     |

  Scenario Outline: Restart retains Queued Prompts and requires explicit resume
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I send the prompt "Second prompt"
    And I send the prompt "Third prompt"
    And the Engine restarts
    Then the queue is paused because "Server restarted"
    And the queued Prompts read "Second prompt|Third prompt"
    When the Agent answers its held prompt
    And I resume the queue
    Then the Feed has completed Prompts in order "First prompt|Second prompt|Third prompt"

    Examples:
      | frame | agent |
      | wide  | 2     |

  Scenario Outline: A Queued Prompt uses the model chosen before it starts
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I choose model "Small"
    And I send the prompt "Second prompt"
    And the Agent answers its held prompt
    Then the Agent switches to model "small" before the next prompt
    And the Feed has completed Prompts in order "First prompt|Second prompt"

    Examples:
      | frame | agent |
      | phone  | 2     |

  Scenario Outline: Paired Apps observe and edit one Server-owned Prompt queue
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    And the Server accepts Devices from the local network
    When a second App pairs with a Pairing Ticket and the owner presses Allow
    And I send the prompt "First prompt"
    And I send the prompt "Second prompt"
    Then the second App reads Queued Prompts "Second prompt"
    When the second App changes its first Queued Prompt to "Edited from another App"
    Then the queued Prompts read "Edited from another App"
    And the second App reads Queued Prompts "Edited from another App"
    When the Agent answers its held prompt
    Then the Feed has completed Prompts in order "First prompt|Edited from another App"
    And the second App cannot overwrite the Prompt that already started

    Examples:
      | frame | agent |
      | wide  | 1     |

  Scenario Outline: A failed queued Turn stays in the Feed and pauses the remaining queue
    Given a <frame> Frame
    And Agent <agent> fails its second queued Turn
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I send the prompt "Second prompt"
    And I send the prompt "Third prompt"
    And the Agent answers its held prompt
    Then the queue is paused because "Turn did not complete normally"
    And the queued Prompts read "Third prompt"
    When I resume the queue
    Then the Feed has completed Prompts in order "First prompt|Second prompt|Third prompt"

    Examples:
      | frame | agent |
      | wide  | 1     |

  Scenario Outline: A Queued Prompt that cannot start remains available to edit or delete
    Given a <frame> Frame
    And Agent <agent> refuses queued images
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I attach the red square image
    And I send the prompt "Image prompt"
    And the Agent answers its held prompt
    Then the queue is paused because "Prompt could not start"
    And the queued Prompts read "Image prompt"
    And the Agent has received only the first Prompt
    When I delete Queued Prompt "Image prompt"
    Then the Message box shows ""

    Examples:
      | frame | agent |
      | phone  | 2     |

  Scenario Outline: Queued attachment content survives a restart and reaches the Agent unchanged
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I attach the red square image
    And I send the prompt "Image prompt"
    And the Engine restarts
    Then the queue is paused because "Server restarted"
    When the Agent answers its held prompt
    And I resume the queue
    Then the Feed has completed Prompts in order "First prompt|Image prompt"
    And the Session Feed contains the prompt "Image prompt" with the red square image
    And the queued image reaches the Agent with its original bytes

    Examples:
      | frame | agent |
      | phone  | 1     |

  Scenario Outline: Prompt Hooks run when queued work starts
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I send the prompt "Rewrite this queued Prompt"
    Then the queued Prompts read "Rewrite this queued Prompt"
    When the Agent answers its held prompt
    Then the Feed has completed Prompts in order "First prompt|Hook ran before this Turn"

    Examples:
      | frame | agent |
      | wide  | 2     |

  Scenario Outline: Queued Prompt controls have tooltips and unsupported Agents offer no steering
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    When I send the prompt "First prompt"
    And I send the prompt "Second prompt"
    And I send the prompt "Third prompt"
    Then queue icons explain their actions
    And the queue offers no unsupported steering
    When the Agent answers its held prompt
    Then the Feed has completed Prompts in order "First prompt|Second prompt|Third prompt"

    Examples:
      | frame | agent |
      | wide  | 1     |

  Scenario Outline: Queued work continues after the App closes
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    And the Server accepts Devices from the local network
    When a second App pairs with a Pairing Ticket and the owner presses Allow
    And I send the prompt "First prompt"
    And I send the prompt "Second prompt"
    And I close the App while its queued work waits
    And the Agent answers its held prompt
    Then the queued Turns finish while that App is closed

    Examples:
      | frame | agent |
      | phone  | 2     |

  Scenario Outline: Closing an editing App releases its held Queued Prompt
    Given a <frame> Frame
    And Agent <agent> holds its first Turn until released
    And a New Session with Agent <agent>
    And the Server accepts Devices from the local network
    When a second App pairs with a Pairing Ticket and the owner presses Allow
    And I send the prompt "First prompt"
    And I send the prompt "Second prompt"
    And I begin editing Queued Prompt "Second prompt"
    And I close the App while its queued work waits
    And the Agent answers its held prompt
    Then the queued Turns finish while that App is closed

    Examples:
      | frame | agent |
      | phone  | 1     |

  Scenario Outline: Concurrent App submissions to an idle Session both become Turns
    Given a <frame> Frame
    And a Session with one completed Turn
    And the Server accepts Devices from the local network
    When a second App pairs with a Pairing Ticket and the owner presses Allow
    And both Apps submit follow-up Prompts together
    Then both follow-ups finish as separate Turns

    Examples:
      | frame |
      | wide  |
