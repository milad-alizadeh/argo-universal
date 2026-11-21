Feature: Project Schedules
  Scenario Outline: A new Project Schedule opens its first Session in a <frame> Frame
    Given a <frame> Frame
    When I open Scheduled
    And I create a Schedule with instructions "Check the nightly build"
    Then the Schedule offers to run for the first time
    When I run the Schedule now
    Then the Session Feed shows the scheduled instructions "Check the nightly build"
    When I reopen the Schedule "Check the nightly build" from its list
    Then the Session Feed shows the scheduled instructions "Check the nightly build"

    Examples:
      | frame |
      | wide  |
      | phone |
