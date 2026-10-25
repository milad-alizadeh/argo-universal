Feature: Connection to the Server
  @smoke
  Scenario: The Connection follows the running Server
    Given a wide Frame
    When I view the Connection
    Then the Connection shows the Server version
    And the Connection follows the Server clock

  Scenario Outline: The Connection leaves a Server failure to the banner and recovers
    Given a <size> Frame
    When I view the Connection
    Then the Connection leaves an unavailable Server to the banner
    And the Connection shows the Server version
    And the Connection follows the Server clock

    Examples:
      | size  |
      | phone |
      | wide  |
