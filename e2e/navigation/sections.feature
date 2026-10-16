Feature: Sections
  Scenario: The Drawer opens another section on a phone Frame
    Given a phone Frame
    When I open Settings
    Then the phone Frame shows the Settings list
    When I return to Sessions
    Then the phone Frame shows the Sessions list

  Scenario: A section opens its first page on a wide Frame
    Given a wide Frame
    When I open Settings
    Then the wide Frame shows Accounts beside the Settings list
    When I return to Sessions
    Then the wide Frame opens the first Sessions page
