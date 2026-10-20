Feature: Archive a Session
  Scenario: Undo keeps uncommitted work in the Session's Checkout
    Given a Session named "Check the live list"
    And an uncommitted file in the Session's Checkout
    When I archive the Session "Check the live list" from its row
    Then the Sessions list no longer shows the live Session
    And a "Session archived" toast offers Undo
    And the Session page shows "Archived · read-only" instead of the Composer
    When I undo the archive
    Then the live Session remains in the list
    And the uncommitted file remains in the Session's Checkout

  Scenario: The Archived filter opens an archived Session's read-only Feed
    Given a Session named "Check the live list"
    When I archive the Session "Check the live list" from its row
    And I filter Sessions to "Archived"
    Then the Archived filter shows the Session "Check the live list"
    When I open the archived Session "Check the live list"
    Then the Session page shows "Archived · read-only" instead of the Composer

  Scenario: Archive waits for the Turn to end
    Given a wide Frame
    When I start a Session named "Check the live list" that waits for input
    Then the Session "Check the live list" offers Rename but not Archive
