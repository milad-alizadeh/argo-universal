Feature: Connection to the Server
  @smoke
  Scenario: The Connection follows the running Server
    Given a wide Frame
    When I view the Connection
    Then the Connection shows the Server version
    And the Connection follows the Server clock

  Scenario Outline: The Connection explains a Server failure and recovers
    Given a <size> Frame
    When I view the Connection
    Then the Connection explains why details cannot load while the Server is unavailable
    And the Connection shows the Server version
    And the Connection follows the Server clock

    Examples:
      | size  |
      | phone |
      | wide  |
