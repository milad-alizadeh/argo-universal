Feature: Changed files' headers stay stuck
  Scenario: Reading long diffs down and back up keeps a file's header at the top
    Given a wide Frame
    And the Project has many files of different lengths
    And Agent 1 edits a file and keeps its Turn running
    And a New Session with Agent 1
    When I send the prompt "Update the greeting"
    And the Session's Checkout changes every file
    And the Agent edits the greeting
    And I open the many changed files
    Then a file's header is at the top of the list all the way down and back up
    When I stop the Turn
