Feature: Session titles
  Scenario: The Agent's title replaces the first prompt line
    Given a wide Frame
    And Agent 1 names its Session
    When I start a Session with the prompt "Check the live list"
    Then the Session is titled with the Agent's title in the list and its header
    And no Session is titled "Check the live list"

  Scenario: A rename shows on another page
    Given a Session named "Check the live list"
    And the Session "Check the live list" is open on another page
    When I rename the Session "Check the live list" to "Ship the release notes"
    Then the other page shows the Session titled "Ship the release notes"
