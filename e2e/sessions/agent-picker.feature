Feature: New Session Agent picker
  Scenario Outline: Add a new agent opens the Agents not yet installed in a <layout> Frame
    Given a <layout> Frame
    When I choose Add a new agent in New Session
    Then the Agents page lists only the Agents not yet installed

    Examples:
      | layout |
      | wide   |
      | phone  |
