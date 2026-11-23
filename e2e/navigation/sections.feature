Feature: Sections
  Scenario: The Drawer opens another section on a phone Frame
    Given a phone Frame
    When I open Settings
    Then the phone Frame shows the Settings list
    When I return to Sessions
    Then the phone Frame shows the Sessions list

  @smoke
  Scenario: A wide Frame opens Settings' first page over Sessions
    Given a wide Frame
    When I open Settings
    Then the wide Frame shows Accounts beside the Settings list
    When I close the Settings modal
    Then the wide Frame shows no Session beside the Sessions list

  Scenario Outline: Closing Settings returns to the underlying page
    Given a wide Frame
    When I open New Session by its URL
    And I open Settings
    Then the Settings modal sits over New Session
    When I dismiss the Settings modal with <control>
    Then New Session is open
    And focus returns to the Settings rail tile

    Examples:
      | control |
      | Escape  |
      | Close   |
      | the dim |

  Scenario: Reopening Settings shows its last page
    Given a wide Frame
    When I open Settings
    And I open Agents from the Settings list
    And I close the Settings modal
    And I open Settings
    Then Agents is open in the Settings modal

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
