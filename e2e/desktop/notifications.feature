@electron-only @smoke
Feature: Desktop Session notifications
  Scenario Outline: A Turn ending restores its Session from a notification
    Given a wide Frame
    And the desktop Notification API is recorded
    And a New Session with Agent <agent>
    When I leave the desktop window "<state>"
    And I send the prompt "Check the notification"
    Then the Agent replies "The shared fixture completed this Turn."
    And one desktop notification says "Turn ended"
    When I click the desktop notification from Settings
    Then the desktop notification opens its Session in the foreground

    Examples:
      | agent | state     |
      | 1     | hidden    |
      | 2     | minimized |

  Scenario: An input request notifies and answering in the foreground stays quiet
    Given a wide Frame
    And the desktop Notification API is recorded
    And Agent 1 asks for an Elicitation
    And a New Session with Agent 1
    When I leave the desktop window "hidden"
    And I send the prompt "Ask for issue details"
    Then the Elicitation "A few details for the new issue" opens over the Composer
    And one desktop notification says "Needs your input"
    When I click the desktop notification from Settings
    Then the desktop notification opens its Session in the foreground
    When I submit the Elicitation title "Notification opens the Session"
    Then the Agent replies "The shared fixture completed this Turn."
    And there is no additional desktop notification

  Scenario: A crash notifies while preserving the existing exit Notice
    Given a wide Frame
    And the desktop Notification API is recorded
    And Agent 1 exits mid-Turn with stderr
    And a New Session with Agent 1
    When I leave the desktop window "hidden"
    And I send the prompt "Crash in the background"
    Then the Feed shows the Agent exit status and stderr
    And one desktop notification says "Turn ended"
