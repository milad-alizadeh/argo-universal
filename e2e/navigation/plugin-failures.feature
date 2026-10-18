Feature: Plugin crash notifications
  Scenario Outline: A Plugin crash reports its own failure while another Plugin keeps running
    Given a crashing Plugin is installed
    And a <size> Frame
    And the App's Connection can be dropped
    When the crashing Plugin starts alongside Counter
    Then an error toast names the crashed Plugin
    And Counter is still running
    When the Plugin crash toast dismisses
    And I open the Counter Plugin
    Then the Plugin page shows Counter
    And the Plugin crash toast stays dismissed
    When the Connection reconnects to the same Plugin failure
    Then the Plugin crash toast stays dismissed

    Examples:
      | size  |
      | wide  |
      | phone |
