Feature: Session header menu
  Scenario: Renaming from the header renames the open Session
    Given a Session named "Check the live list"
    When I rename the open Session to "Check the renamed list" from its header
    Then the Session page and its row are titled "Check the renamed list"

  Scenario: Renaming a closed Session from the header shows its new title
    Given a Session named "Check the live list"
    And the Server closes the Session quietly
    When I rename the open Session to "Check the renamed list" from its header
    Then the Session page and its row are titled "Check the renamed list"

  Scenario: Archiving from the header leaves the Session
    Given a Session named "Check the live list"
    When I archive the open Session from its header
    Then the Sessions list no longer shows the live Session
    And a toast announces the archive and offers Undo
    And no Session page is open
