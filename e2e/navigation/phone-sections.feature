Feature: Phone sections
  Scenario: A phone section keeps its search while another is shown
    Given a phone Frame
    And the Sessions search has no matches
    When I open Settings
    And I return to Sessions
    Then the Sessions list has no matching Sessions
