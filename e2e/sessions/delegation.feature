Feature: Session delegation
  Scenario: An Agent starts a Session through the CLI and the list nests it
    Given a wide Frame
    And Agent 1 delegates work through the argo CLI
    And a New Session with Agent 1
    When I send the prompt "Delegate the investigation"
    Then the delegated Session appears under its calling Session
    When the Frame becomes a phone Frame
    And I return to Sessions
    Then the phone list preserves the delegated Session after its caller
