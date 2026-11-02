Feature: Pairing a second App
  Scenario: A second App pairs over the local network and reads a Session through the encrypted channel
    Given a Session named "Check the pairing"
    And the Server accepts Devices from the local network
    When a second App pairs with a Pairing Ticket and the owner presses Allow
    Then the second App reads the Session "Check the pairing" through the encrypted channel
    And the second App is a Paired Device the Server lists by name
    When the owner unpairs the second App
    Then the Server lists only the Server Device
    When the Server stops, nothing still listens on its port
