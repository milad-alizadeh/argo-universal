Feature: Plugin navigation
  Scenario Outline: Manifest nav items open their Plugin on a wide Frame
    Given a wide Frame
    Then the navigation lists core sections before Plugin items
    When I open the <item> Plugin
    Then the Plugin page shows <name>

    Examples:
      | item   | name          |
      | Issues | Issue tracker |
      | Hello  | Hello         |

  Scenario: A tap on a Plugin page reaches the Plugin and redraws the page
    Given a wide Frame
    When I open the Hello Plugin
    Then the Plugin page text reads "Tapped 0 times"
    When I press "Tap me" on the Plugin page
    Then the Plugin page text reads "Tapped 1 times"

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
      | first  | first name    | second | second name |
      | Issues | Issue tracker | Hello  | Hello       |
