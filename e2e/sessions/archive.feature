Feature: Archive a Session
  Scenario: Archiving on a wide Frame removes the row and offers Undo
    Given a Session named "Check the live list"
    When I archive the Session "Check the live list" from its row
    Then the Sessions list no longer shows the live Session
    And a "Session archived" toast offers Undo
    When I undo the archive
    Then the live Session remains in the list

  Scenario: An archived Session's Feed is read-only
    Given a Session named "Check the live list"
    When I archive the Session "Check the live list" from its row
    Then the Session page shows "Archived · read-only" instead of the Composer

  Scenario: Archive waits for the Turn to end
    Given a wide Frame
    When I start a Session named "Check the live list" that waits for input
    Then the Session "Check the live list" offers Rename but not Archive
