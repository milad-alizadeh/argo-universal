Feature: Drafts kept on this Device
  Scenario: A Session's draft is restored after a reload
    Given a Session named "Plan the release"
    And the draft "Ship on Friday" in the Session "Plan the release"
    When I reload the App and open the Session "Plan the release"
    Then the Message box shows "Ship on Friday"

  Scenario: New Session's draft text is restored after a reload, without its images
    Given a phone Frame
    And a New Session
    And this draft in New Session:
      """
      Tidy the README
      and link the ADRs
      """
    And I attach the red square image
    When I reload the App and open New Session
    Then the Message box shows:
      """
      Tidy the README
      and link the ADRs
      """
    And no image is attached

  Scenario: A prompt sent in a Session is not restored as a draft
    Given a Session named "Plan the release"
    When I send the prompt "Ship on Friday"
    And I reload the App and open the Session "Plan the release"
    Then the Message box is empty

  Scenario: A prompt that failed to send in a Session is restored after a reload
    Given a phone Frame
    And Agent 1 refuses to reopen a Session
    And a New Session with Agent 1
    And I send the prompt "Plan the release"
    And the Agent replies "The shared fixture completed this Turn."
    And the Server closes the Session quietly
    When I try to send the prompt "Ship on Friday"
    Then the Composer says the prompt couldn't send
    When I reload the App and open the Session "Plan the release"
    Then the Message box shows "Ship on Friday"

  Scenario: A first prompt that opened a Session is not restored in New Session
    Given a wide Frame
    And a New Session
    When I send the prompt "Tidy the README"
    And I open a New Session
    Then the Message box is empty

  Scenario: A first prompt whose Session failed to open is restored after a reload
    Given a phone Frame
    And every Agent refuses to open a Session
    When I open a New Session
    And I write the prompt "Fix the flaky login test"
    Then New Session says the Session couldn't open
    When I reload the App and open New Session
    Then the Message box shows "Fix the flaky login test"
