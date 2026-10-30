@smoke @electron-only @mac-only
Feature: Desktop attention and quit
  Scenario Outline: The Dock follows Session attention without a renderer
    Given a wide Frame
    Then the Dock badge is ""
    When I start a Session named "Desktop attention" that waits for input
    Then the Dock badge is "1"
    When I start a Session named "More desktop attention" that waits for input
    Then the Dock badge is "2"
    When I close the desktop window
    Then the Dock badge is "2"
    When the desktop Server disconnects
    Then the Dock badge is ""

    Examples:
      | platform |
      | macOS    |

  # Manual-only on a Mac: the native Keep / Stop prompt is clicked through macOS accessibility, so it takes focus
  # (@needs-focus, skipped unless ARGO_E2E_FOCUS=1) and cannot run on Linux CI (@mac-only). CI never runs it.
  # Run it by hand: ARGO_E2E_FOCUS=1 pnpm exec turbo run test:electron --filter=@repo/e2e
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
