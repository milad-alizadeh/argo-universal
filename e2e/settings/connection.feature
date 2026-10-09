Feature: Connection to the Server
  Scenario: The Connection follows the running Server
    Given a wide Frame
    When I view the Connection
    Then the Connection shows the Server version
    And the Connection follows the Server clock
