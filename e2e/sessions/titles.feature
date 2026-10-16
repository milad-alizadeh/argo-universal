@web-only
Feature: Session titles
  Scenario: The Agent's title replaces the first prompt line
    Given Agent 1 names its Session after a question
    And a Session titled "Check the live list" waits on the Agent's question
    When I answer the Agent's question
    Then the Session is titled with the Agent's title in the list and its header
    And no Session is titled "Check the live list"

  Scenario: A rename on another page shows on this one
    Given a Session named "Check the live list"
    When I rename the Session "Check the live list" to "Ship the release notes" on another page
    Then the Session is titled "Ship the release notes" in the list and its header
    And no Session is titled "Check the live list"

  Scenario: My rename wins over the Agent's later title
    Given Agent 1 names its Session after a question
    And a Session titled "Check the live list" waits on the Agent's question
    And I rename the Session "Check the live list" to "Ship the release notes" on another page
    When I answer the Agent's question
    Then the saved Session keeps the title "Ship the release notes" once the Turn ends
