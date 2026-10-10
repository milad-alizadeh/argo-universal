Feature: Live Sessions list
  Scenario: A completed Turn marks its Session unread
    Given a wide Frame
    When I start a Session named "Check the live list"
    Then the Sessions list shows the unread Session with one attention badge

  Scenario Outline: Search matches Session titles without case sensitivity
    Given a Session named "Check the live list"
    When I search Sessions for "<search>"
    Then <result>

    Examples:
      | search                                  | result                                    |
      | CHECK THE LIVE LIST                     | the live Session remains in the list      |
      | Check the live list that matches nothing | the Sessions list has no matching Sessions |

  Scenario: Finishing search restores the Sessions list
    Given a Session named "Check the live list"
    And the Sessions search has no matches
    When I finish searching Sessions
    Then the live Session remains in the list

  Scenario Outline: Filtering includes only the chosen Session state
    Given a Session named "Check the live list"
    When I filter Sessions to "<filter>"
    Then <result>

    Examples:
      | filter   | result                                  |
      | Archived | the Sessions list has no archived Sessions |
      | Active   | the live Session remains in the list    |

  Scenario: Phone navigation shows the same attention count
    Given an unread Session in a phone Frame
    When I view the phone navigation
    Then navigation shows one Session needing attention

  Scenario: A long list loads more Sessions as it scrolls
    Given a wide Frame
    And 60 long-list Sessions
    When I scroll the Sessions list to the end
    Then the Sessions list shows the oldest Session
