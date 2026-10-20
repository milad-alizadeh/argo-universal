@web-only
Feature: Answer from two Apps
  Background:
    Given a wide Frame
    And Agent 1 asks permission to edit README.md
    And a New Session with Agent 1
    When I send the prompt "Fix the README"
    And I open the Session "Fix the README" on another page
    Then both pages show the Permission request "Edit README.md"

  Scenario: The first answer closes the request on both pages
    When I answer the Permission request with "Allow"
    Then the Agent receives the selected option "allow"
    And both pages show the Agent reply "The shared fixture completed this Turn."
    And the Permission request "Edit README.md" closes on both pages

  Scenario: A late answer reads already answered until the Turn ends
    Given the other page stops receiving live updates
    When I answer the Permission request with "Allow"
    And I answer the Permission request with "Reject" on the other page
    Then the other page reads that the request was already answered
    And the Agent receives the selected option "allow"
    When the other page receives live updates again
    Then the other page shows the Agent reply "The shared fixture completed this Turn." and the Permission request "Edit README.md" closes
