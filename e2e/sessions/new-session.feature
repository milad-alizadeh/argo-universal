Feature: New Session
  Scenario Outline: A text prompt starts a Session with Agent <agent>
    Given a phone Frame
    And a New Session with Agent <agent>
    When I send the prompt "Fix the flaky login test"
    Then the Session Feed contains the text prompt "Fix the flaky login test"
    And the Agent replies "The shared fixture completed this Turn."
    And Back returns to the Sessions list

    Examples:
      | agent |
      | 1     |
      | 2     |

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

  Scenario Outline: An image prompt starts a Session with Agent <agent>
    Given a phone Frame
    And Agent <agent> can inspect image prompts
    When I attach the red square image
    And I send the prompt "Name the dominant color in this image."
    Then the Session Feed contains the image prompt
    And the Agent replies "The dominant color is red."
    And the Server preserves the attached image

    Examples:
      | agent |
      | 1     |
      | 2     |

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
