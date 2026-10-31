Feature: Back from a deep-linked page
  @web-only
  Scenario: Back from a Project page opened on its own returns to its list with a clean address
    Given the Project page was opened on its own in a phone Frame
    When I go Back from the page
    Then the phone Frame shows the Projects list with a clean address

  @web-only
  Scenario: Back from a Session page opened on its own returns to Sessions with a clean address
    Given a missing Session was opened on its own in a phone Frame
    When I go Back from the page
    Then the phone Frame shows the Sessions list with a clean address
