Feature: Turns
  Scenario: A quiet Session resumes on the next prompt
    Given a phone Frame
    And a Session with one completed Turn
    And the Server closes the Session quietly
    When I send the prompt "Second prompt"
    Then both submitted prompts have separate completed Turns
    And no alert is shown
