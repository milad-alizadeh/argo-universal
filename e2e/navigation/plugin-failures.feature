Feature: Plugin crash notifications
  Scenario Outline: A Plugin crash reports its own failure while another Plugin keeps running
    Given a crashing Plugin is installed
    And a <size> Frame
    And the App's Connection can be dropped
    When the crashing Plugin starts alongside Issue tracker
    Then an error toast names the crashed Plugin
    And Issue tracker is still running
    When the Plugin crash toast dismisses
    And I open the Issues Plugin
    Then the Plugin page shows Issue tracker
    And the Plugin crash toast stays dismissed
    When the Connection reconnects to the same Plugin failure
    Then the Plugin crash toast stays dismissed

    Examples:
      | size  |
      | wide  |
      | phone |
