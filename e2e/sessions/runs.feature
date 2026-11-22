Feature: Run a Checkout app from the Workbench
  Scenario: Start a Run, type in its Terminal, and stop it
    Given a wide Frame
    And the Project has a Run Configuration that reads Terminal input
    And a New Session with Agent 1
    When I send the prompt "Open the Checkout"
    And I start the web Run from the Workbench
    And I open the web Run Terminal
    When I type into the web Run Terminal
    Then the web Run Terminal shows the command's response
    When I stop web from its Run Inspector
    Then the Run Inspector shows web stopped

  Scenario: Report and recover from a bad hand-written Run Configuration
    Given a wide Frame
    And a New Session with Agent 1
    When I choose the local Checkout
    And I send the prompt "Open the Checkout"
    And I try to draft a Run Configuration without a source
    When I write a Run Configuration without a command
    Then the Runs notification identifies the missing command
    When I correct the Run Configuration
    Then the Workbench offers to start web
