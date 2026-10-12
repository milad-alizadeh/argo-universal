Feature: Drafts kept on this Device
  Scenario: A Session's draft is restored after a reload
    Given a Session named "Plan the release"
    And the draft "Ship on Friday" in the Session "Plan the release"
    When I reload the App and open the Session "Plan the release"
    Then the Message box shows "Ship on Friday"

  Scenario: New Session's draft is restored after a reload
    Given a phone Frame
    And a New Session
    And the draft "Tidy the README" in New Session
    When I reload the App and open New Session
    Then the Message box shows "Tidy the README"

  Scenario: A prompt sent in a Session is not restored as a draft
    Given a Session named "Plan the release"
    When I send the prompt "Ship on Friday"
    And I reload the App and open the Session "Plan the release"
    Then the Message box is empty

  Scenario: A first prompt that opened a Session is not restored in New Session
    Given a wide Frame
    And a New Session
    When I send the prompt "Tidy the README"
    And I open a New Session
    Then the Message box is empty

  Scenario: A first prompt whose Session failed to open is restored after a reload
    Given a phone Frame
    And Agent 1 refuses to open a Session
    And a New Session with Agent 1
    When I try to send the prompt "Fix the flaky login test"
    And I reload the App and open New Session
    Then the Message box shows "Fix the flaky login test"
