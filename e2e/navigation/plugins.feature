Feature: Plugin navigation
  Scenario Outline: Manifest nav items open their Plugin on a wide Frame
    Given a wide Frame
    Then the navigation lists core sections before Plugin items
    When I open the <item> Plugin
    Then the Plugin page shows <name>

    Examples:
      | item    | name    |
      | Lists   | Lists   |
      | Counter | Counter |

  @smoke
  Scenario: A tap on a Plugin page reaches the Plugin and redraws the page
    Given a wide Frame
    When I open the Counter Plugin
    Then the Plugin page text reads "Tapped 0 times"
    When I press "Tap me" on the Plugin page
    Then the Plugin page text reads "Tapped 1 times"

  Scenario Outline: A Plugin List stays usable on a <frame> Frame
    Given a <frame> Frame
    When I open the Lists Plugin
    Then the Plugin page text reads "Deploy web"
    And the Plugin page text reads "Build native"
    When I press "Deploy web" on the Plugin page
    Then the Plugin row "Deploy web" is selected

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario: A Plugin opens New Session with its draft, which is not kept
    Given a wide Frame
    When I open the Counter Plugin
    And I press "Start Session" on the Plugin page
    Then New Session opens with this draft:
      """
      #7 Keep %2F in paths
      https://example.com/fixture/7
      """
    When I reload the App and open New Session
    Then the Message box is empty

  Scenario Outline: The phone drawer opens Plugins and returns to core sections
    Given a phone Frame
    When I open the <first> Plugin
    Then the Plugin page shows <first name>
    When I open the <second> Plugin
    Then the Plugin page shows <second name>
    When I open the <first> Plugin
    Then the Plugin page shows <first name>
    When I return to Sessions
    Then the phone Frame shows the Sessions list
    And the navigation lists core sections before Plugin items

    Examples:
      | first | first name | second  | second name |
      | Lists | Lists      | Counter | Counter     |

  Scenario Outline: A Plugin fills the Project details Slot on a <frame> Frame
    Given a <frame> Frame
    When I open Settings
    And I open the Projects
    And I open the Server Project
    Then the Project details show the fixture Plugin Slot

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: Plugin detail actions fit on a <frame> Frame
    Given a <frame> Frame
    When I open the Counter Plugin
    And I press "Open details" on the Plugin page
    Then the Plugin detail actions fit in the viewport

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario Outline: A Plugin item page draws its content and Metadata on a <frame> Frame
    Given a <frame> Frame
    When I open the Counter Plugin
    And I press "Open item" on the Plugin page
    Then the Plugin item shows its content and Metadata

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario: A Plugin ListDetail keeps its list in the sidebar on a wide Frame
    Given a wide Frame
    When I open the Issues Plugin
    Then the Plugin page says "Select an Issue"
    And the Plugin list shows "Sync fails on large repos" in the sidebar
    When I open the Plugin row "Add CSV export"
    Then the Plugin page heading reads "Add CSV export"
    And the Plugin list shows "Sync fails on large repos" in the sidebar

  Scenario: A Plugin's Session header action opens its page
    Given a Session named "Check the live list"
    When I press "Open Counter" in the Session header
    Then the Plugin page shows Counter
    And the Plugin page opened for that Session

  Scenario: A Plugin ListDetail drills into the opened row on a phone Frame
    Given a phone Frame
    When I open the Issues Plugin
    And I open the Plugin row "Add CSV export"
    Then the Plugin page heading reads "Add CSV export"
    And the Plugin row "Sync fails on large repos" is hidden
