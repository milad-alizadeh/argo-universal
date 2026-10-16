Feature: Session titles
  Scenario: The Agent's title replaces the first prompt line
    Given a wide Frame
    And Agent 1 names its Session after a question
    When I start a Session with the prompt "Check the live list"
    Then the Session is titled "Check the live list" in the list and its header
    When I submit the Elicitation title "Drafts vanish after a reconnect"
    Then the Session is titled with the Agent's title in the list and its header
    And no Session is titled "Check the live list"

  Scenario: A rename on another page shows on this one
    Given a Session named "Check the live list"
    When I rename the Session "Check the live list" to "Ship the release notes" on another page
    Then the Session is titled "Ship the release notes" in the list and its header
