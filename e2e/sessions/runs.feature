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
