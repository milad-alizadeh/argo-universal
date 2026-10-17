@web-only
Feature: Leave plan mode
  Scenario: Approve the plan from the Permission request
    Given a wide Frame
    And Agent 1 asks to leave plan mode
    And a New Session with Agent 1
    When I send the prompt "Plan the typo fix"
    Then the Permission request "Ready to code?" opens over the Composer
    When I choose "Yes, and manually approve edits"
    Then the Agent replies "The shared fixture completed this Turn."
    And the Permission request closes
