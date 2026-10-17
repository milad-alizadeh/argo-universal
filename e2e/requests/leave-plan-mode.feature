@web-only
Feature: Leave plan mode
  Scenario: Approve the plan from the Permission request
    Given a wide Frame
    And Agent 1 asks to leave plan mode
    And a New Session with Agent 1
    When I send the prompt "Plan the typo fix"
    Then the Permission request "Approve Plan" opens over the Composer
    When I answer the Permission request with "Yes, manually approve edits"
    Then the Agent replies "The shared fixture completed this Turn."
    And the Permission request "Approve Plan" closes and the Composer accepts "Start with the README"
