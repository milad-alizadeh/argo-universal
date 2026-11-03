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

  Scenario: A page seen before draws at once while the Server has not answered
    Given a wide Frame
    And the Server's answers to Plugin pages can be held
    When I open the Counter Plugin
    Then the Plugin page text reads "Tapped 0 times"
    When I open the Lists Plugin
    Then the Plugin page text reads "Deploy web"
    When the Server's answers to Plugin pages are held
    And I open the Counter Plugin
    Then no Plugin page has answered
    And the Plugin page text reads "Tapped 0 times"
    When the Server's answers to Plugin pages arrive
    Then the Plugin page text reads "Tapped 0 times"

  Scenario: A tap on a page seen before waits for the Server and lands once
    Given a wide Frame
    And the Server's answers to Plugin pages can be held
    When I open the Counter Plugin
    Then the Plugin page text reads "Tapped 0 times"
    When I open the Lists Plugin
    Then the Plugin page text reads "Deploy web"
    When the Server's answers to Plugin pages are held
    And I open the Counter Plugin
    Then no Plugin page has answered
    When I press "Tap me" on the Plugin page
    Then the Plugin page text reads "Tapped 0 times"
    When the Server's answers to Plugin pages arrive
    Then the Plugin page text reads "Tapped 1 times"

  Scenario: A Plugin turned off and on draws nothing it kept from before
    Given a wide Frame
    And the Server's answers to Plugin pages can be held
    When I open the Counter Plugin
    Then the Plugin page text reads "Tapped 0 times"
    When I open the Lists Plugin
    Then the Plugin page text reads "Deploy web"
    When the Counter Plugin is turned off on the Server
    Then the navigation no longer lists the Counter Plugin
    When the Counter Plugin is turned back on on the Server
    And the Server's answers to Plugin pages are held
    And I open the Counter Plugin
    Then no Plugin page has answered
    And the Plugin page does not read "Tapped 0 times"
    When the Server's answers to Plugin pages arrive
    Then the Plugin page text reads "Tapped 0 times"

  Scenario: A Plugin stopped on the Server leaves the navigation and its open page returns to Sessions
    Given a wide Frame
    When I open the Counter Plugin
    Then the Plugin page shows Counter
    When the Counter Plugin is turned off on the Server
    Then the App returns to Sessions
    And the navigation no longer lists the Counter Plugin
    And a toast says the Plugin is not available

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

  Scenario: Back from New Session started on a Plugin page returns to that page
    Given a phone Frame
    When I open the Counter Plugin
    And I press "Start Session" on the Plugin page
    And I press Back in the page header
    Then the Plugin page shows Counter

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

  Scenario: A Plugin's line on the Session bar opens its page
    Given a Session named "Check the Session bar"
    Then the Session bar reads "Counter bar"
    When I press Open for the Counter Plugin on the Session bar
    Then the Plugin page shows Counter

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
    And the page header has no Back

  Scenario: A Plugin's Session header action opens its page
    Given a Session named "Check the live list"
    When I press "Open Counter" in the Session header
    Then the Plugin page shows Counter
    And the Plugin page opened for that Session

  Scenario: A Plugin's Workbench card opens its Inspector tab, and its header action closes it
    Given a wide Frame
    And a Session named "Check the live list"
    Then the Session Workbench shows the Plugin card "Counter card"
    When I press the Plugin card "Counter card"
    Then the Inspector tab "Counter card" shows "Counter card in full"
    When I press "Toggle Counter card" in the Session header menu
    Then the Session Workbench has no Plugin card "Counter card"
    When I press "Toggle Counter card" in the Session header menu
    Then the Session Workbench shows the Plugin card "Counter card"

  Scenario: A Plugin's Workbench card with nothing to show has no card, no Inspector tab and no header action
    Given a wide Frame
    And a Session named "Check the live list"
    Then the Session Workbench shows the Plugin card "Counter card"
    And the Session Workbench has no Plugin card "Notes"
    And the Session header menu omits "Toggle Notes card"
    When I press "Open Notes switch" in the Session header menu
    And I fill the Notes card on the Plugin page
    And I go back to the Session
    Then the Session Workbench shows the Plugin card "Notes"
    And the Session header menu lists "Toggle Notes card"
    When I press the Plugin card "Notes"
    Then the Inspector tab "Notes" shows "Notes in full"
    When I press "Open Notes switch" in the Session header menu
    And I empty the Notes card on the Plugin page
    And I go back to the Session
    Then the Session Workbench has no Plugin card "Notes"
    And the Inspector has no tab "Notes"

  Scenario: A Plugin ListDetail drills into the opened row on a phone Frame
    Given a phone Frame
    When I open the Issues Plugin
    And I open the Plugin row "Add CSV export"
    Then the Plugin page heading reads "Add CSV export"
    And the Plugin row "Sync fails on large repos" is hidden

  Scenario: A Plugin item on a Session row opens its Plugin page
    Given a Session named "Check the live list"
    Then the Session row "Check the live list" shows the Plugin item "Counter item"
    When I press the Plugin item "Counter item" on the Session row "Check the live list"
    Then the Plugin page shows Counter

  Scenario: The Plugin this Device picks writes a Session row's Activity line
    Given a Session named "Check the Activity line"
    Then the Session row "Check the Activity line" keeps Argo's Activity line
    When I open Settings
    And I pick the "Counter" Plugin to write the Activity line
    And I return to Sessions
    Then the Session row "Check the Activity line" shows the Activity line "Counter line"

  Scenario: Back from a Plugin ListDetail row on a phone Frame returns to its list
    Given a phone Frame
    When I open the Issues Plugin
    And I open the Plugin row "Add CSV export"
    And I press Back in the page header
    Then the Plugin row "Sync fails on large repos" is shown

  Scenario: Browser Back on a reloaded Plugin page on a phone Frame keeps the way back to its list
    Given a phone Frame
    When I open the Issues Plugin
    And I open the Plugin row "Add CSV export"
    And I reload the Plugin page and press the browser's Back
    And I press Back in the page header
    Then the Plugin row "Sync fails on large repos" is shown
