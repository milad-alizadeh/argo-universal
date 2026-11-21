Feature: Plugin Drafts
  @dev-plugins
  Scenario Outline: A dev Plugin's Draft page shows the Draft bar and a state redraws the page on a <frame> Frame
    Given a <frame> Frame
    When I open the Drafts Plugin
    Then the Plugin page text reads "Draft issues"
    And the Draft bar is shown
    When I choose the "Empty" Draft state
    Then the Plugin page text reads "Nothing here yet"

    Examples:
      | frame |
      | wide  |
      | phone |

  Scenario: A Plugin that is not dev shows no Draft bar
    Given a wide Frame
    When I open the Drafts Plugin
    Then the Plugin page text reads "Draft issues"
    And no Draft bar is shown
