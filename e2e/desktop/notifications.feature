@electron-only @smoke
Feature: Desktop Session notifications
  Scenario: Failed native delivery retries without acknowledging success
    Given a wide Frame
    And the desktop Notification API is recorded
    And the next desktop notification delivery fails
    And a New Session with Agent 1
    When I prepare the desktop prompt "Retry the notification"
    And I leave the desktop window "hidden"
    And I send the prepared desktop prompt without activating the window
    Then one desktop notification for "Retry the notification" says "Turn ended"
    And desktop notification delivery retries once

  Scenario: A focused window on Settings notifies for another Session
    Given a wide Frame
    And the desktop Notification API is recorded
    And a New Session with Agent 1
    And the desktop window is focused
    When I prepare the desktop prompt "Foreground Session"
    And I send the prepared desktop prompt without activating the window
    Then the notification Session shows 1 completed replies
    And one desktop notification for "Foreground Session" says "Turn ended"
    When I click the foreground desktop notification
    Then the desktop notification opens its Session in the foreground
    When I leave the Session for Settings
    And another App prompts the notification Session
    Then the focused window receives one desktop notification saying "Turn ended"
    When I click the foreground desktop notification
    Then the desktop notification opens its Session in the foreground

  Scenario: A focused window on the Session stays quiet
    Given a wide Frame
    And the desktop Notification API is recorded
    And a New Session with Agent 1
    And the desktop window is focused
    When I prepare the desktop prompt "Viewed Session"
    And I send the prepared desktop prompt without activating the window
    Then the notification Session shows 1 completed replies
    And one desktop notification for "Viewed Session" says "Turn ended"
    When I click the foreground desktop notification
    Then the desktop notification opens its Session in the foreground
    When another App prompts the notification Session
    Then the notification Session shows 2 completed replies
    And there is no additional desktop notification

  Scenario Outline: A Turn ending restores its Session from a notification
    Given a wide Frame
    And the desktop Notification API is recorded
    And a New Session with Agent <agent>
    When I prepare the desktop prompt "Check the notification"
    And I leave the desktop window "<state>"
    And I send the prepared desktop prompt without activating the window
    Then the Agent replies "The shared fixture completed this Turn."
    And one desktop notification for "Check the notification" says "Turn ended"
    When I click the desktop notification from Settings
    Then the desktop notification opens its Session in the foreground

    Examples:
      | agent | state     |
      | 1     | hidden    |
      | 2     | minimized |
      | 1     | unfocused |

  Scenario: An input request notifies and answering in the foreground stays quiet
    Given a wide Frame
    And the desktop Notification API is recorded
    And Agent 1 asks for an Elicitation
    And a New Session with Agent 1
    When I prepare the desktop prompt "Ask for issue details"
    And I leave the desktop window "hidden"
    And I send the prepared desktop prompt without activating the window
    Then the Elicitation "A few details for the new issue" opens over the Composer
    And one desktop notification for "Ask for issue details" says "Needs your input"
    When I click the desktop notification from Settings
    Then the desktop notification opens its Session in the foreground
    When I decline the desktop Elicitation
    Then the Agent replies "The shared fixture completed this Turn."
    And there is no additional desktop notification

  Scenario: A crash notifies while preserving the existing exit Notice
    Given a wide Frame
    And the desktop Notification API is recorded
    And Agent 1 exits mid-Turn with stderr
    And a New Session with Agent 1
    When I prepare the desktop prompt "Crash in the background"
    And I leave the desktop window "hidden"
    And I send the prepared desktop prompt without activating the window
    Then the Feed shows the Agent exit status and stderr
    And one desktop notification for "Crash in the background" says "Turn ended"

  Scenario: Cancelling a Turn notifies once in the background
    Given a wide Frame
    And the desktop Notification API is recorded
    And Agent 1 supplies an unfinished command
    And a New Session with Agent 1
    When I prepare the desktop prompt "Run the checks"
    And I leave the desktop window "hidden"
    And I send the prepared desktop prompt without activating the window
    And the command is running in the Feed
    And I stop the desktop Turn without activating the window
    Then one desktop notification for "Run the checks" says "Turn ended"

  Scenario: Successive input requests notify despite an unchanged Session list status
    Given a wide Frame
    And the desktop Notification API is recorded
    And Agent 1 asks successive questions
    And a New Session with Agent 1
    When I prepare the desktop prompt "Ask successive questions"
    And I leave the desktop window "hidden"
    And I send the prepared desktop prompt without activating the window
    Then one desktop notification for "Ask successive questions" says "Needs your input"
    When I decline the desktop Elicitation without activating the window
    Then the desktop records 2 notifications saying "Needs your input"

  Scenario: Reconnecting keeps the notification cursor and still observes the next Turn
    Given a wide Frame
    And the desktop Notification API is recorded
    And a New Session with Agent 1
    When I prepare the desktop prompt "Before reconnect"
    And I leave the desktop window "hidden"
    And I send the prepared desktop prompt without activating the window
    Then one desktop notification for "Before reconnect" says "Turn ended"
    When the Engine restarts
    And I prepare the desktop prompt "After reconnect"
    And I leave the desktop window "hidden"
    And I send the prepared desktop prompt without activating the window
    Then the desktop records 2 notifications saying "Turn ended"
