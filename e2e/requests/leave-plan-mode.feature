@web-only
Feature: Leave plan mode
  Scenario: Build the plan from the Permission request
    Given a wide Frame
    And Agent 1 asks to leave plan mode
    And a New Session with Agent 1
    When I send the prompt "Plan the typo fix"
    Then the plan "Fix the README typo" opens over the Composer
    When I show the plan
    Then the plan reads "Read README.md"
    When I answer the Permission request with "Build"
    Then the Agent replies "The shared fixture completed this Turn."
    And the plan "Fix the README typo" closes and the Composer accepts "Start with the README"
