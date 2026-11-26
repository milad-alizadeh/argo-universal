@smoke
Feature: Always allow a Schedule into another Project
  Scenario: Always allow covers the next Schedule, and Settings revokes it after asking
    Given a wide Frame
    And another Project has a Session
    And Agent 1 schedules follow-ups in another Project
    And a New Session with Agent 1
    When I send the prompt "Schedule the follow-ups"
    Then the Schedule asks first
    And the Permission request says what Always allow covers
    When I answer the Permission request with Always allow
    Then both Schedules are made
    And the second Schedule ran without asking
    When I open Settings
    And I open Agent access
    Then Always allowed lists "Schedule Prompt" from this Project into the other
    When I revoke "Schedule Prompt" and confirm
    Then Always allowed lists nothing
