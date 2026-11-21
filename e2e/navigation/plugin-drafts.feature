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

  @dev-plugins
  Scenario: Each region steps its own Variant and the picks mix
    Given a wide Frame
    When I open the Drafts Plugin
    Then the Plugin page text reads "Header compact"
    And the Plugin page text reads "List rows"
    And the "Header" region tag reads "Header · A 1/3"
    And the "List" region tag reads "List · A 1/2"
    When I step the "Header" region to the next Variant
    Then the Plugin page text reads "Header tabs"
    And the Plugin page text reads "List rows"
    When I step the "List" region to the next Variant
    Then the Plugin page text reads "Header tabs"
    And the Plugin page text reads "List cards"
    And the "Header" region tag reads "Header · B 2/3"
    And the "List" region tag reads "List · B 2/2"
