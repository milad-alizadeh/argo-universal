@smoke @electron-only @mac-only
Feature: Desktop attention and quit
  Scenario Outline: The Dock follows Session attention without a renderer
    Given a wide Frame
    Then the Dock badge is ""
    When I start a Session named "Desktop attention"
    Then the Dock badge is "1"
    When I start a Session named "More desktop attention"
    Then the Dock badge is "2"
    When I close the desktop window
    Then the Dock badge is "2"
    When the desktop Server disconnects
    Then the Dock badge is ""

    Examples:
      | platform |
      | macOS    |

  @supervisor @owned-supervisor @needs-focus
  Scenario Outline: Quitting an App that started its Supervisor
    Given a wide Frame
    And I start a desktop Session that keeps running
    When I quit the desktop App and choose "<choice>"
    Then the desktop Supervisor is "<state>"

    Examples:
      | choice | state   |
      | Keep   | running |
      | Stop   | stopped |

  @supervisor
  Scenario Outline: Quitting an App that reused a Supervisor
    Given a wide Frame
    And I start a desktop Session that keeps running
    When I quit the desktop App
    Then the desktop Supervisor is "running"

    Examples:
      | platform |
      | macOS    |
