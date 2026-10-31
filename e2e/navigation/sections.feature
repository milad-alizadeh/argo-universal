Feature: Sections
  Scenario: The Drawer opens another section on a phone Frame
    Given a phone Frame
    When I open Settings
    Then the phone Frame shows the Settings list
    When I return to Sessions
    Then the phone Frame shows the Sessions list

  @smoke
  Scenario: A wide Frame opens Settings' first page and shows no Session until one is picked
    Given a wide Frame
    When I open Settings
    Then the wide Frame shows Accounts beside the Settings list
    When I return to Sessions
    Then the wide Frame shows no Session beside the Sessions list

  Scenario: Leaving New Session opened by its URL through the rail keeps the rail working
    Given a wide Frame
    When I open New Session by its URL
    And I open Settings
    Then the wide Frame shows Accounts beside the Settings list
    When I return to Sessions
    Then the wide Frame shows no Session beside the Sessions list

  Scenario: An unknown address opens inside the wide Frame
    Given a wide Frame
    When I open an address no page answers
    Then the wide Frame shows Not found beside the Sessions list
    When I leave Not found for Sessions
    Then the wide Frame shows no Session beside the Sessions list

  Scenario: An unknown address opens inside the phone Frame
    Given a phone Frame
    When I open an address no page answers
    Then the phone Frame shows Not found
