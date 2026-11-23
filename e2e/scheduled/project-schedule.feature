Feature: Project Schedules
  Scenario Outline: A new Project Schedule opens its one Session in a <frame> Frame
    Given a <frame> Frame
    When I open Scheduled
    And I create a Schedule with instructions "Check the nightly build"
    Then the Schedule opens its Session
    When I reopen the Schedule "Check the nightly build" from its list
    Then the Schedule opens the same Session

    Examples:
      | frame |
      | wide  |
      | phone |
