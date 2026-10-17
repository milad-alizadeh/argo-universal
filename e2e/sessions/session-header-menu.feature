Feature: Session header menu
  Scenario: Renaming from the header renames the open Session
    Given a Session named "Check the live list"
    When I rename the open Session to "Check the renamed list" from its header
    Then the Session page and its row are titled "Check the renamed list"

  Scenario: Archiving from the header leaves the Session
    Given a Session named "Check the live list"
    When I archive the open Session from its header
    Then the Sessions list no longer shows the live Session
    And a "Session archived" toast offers Undo
    And no Session page is open
