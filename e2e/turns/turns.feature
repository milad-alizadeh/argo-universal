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
