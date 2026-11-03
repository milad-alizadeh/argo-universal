@without-projects
Feature: Add a Project from the App
  Scenario Outline: Add the Server's folder as a Project from Get started on <device>
    Given a wide Frame
    And the fixture Server has no Projects
    When I add the fixture folder as a Project from Get started
    Then Get started no longer asks for a Project

    @web-only
    Examples: Browser
      | device |
      | web    |

    @smoke @electron-only @mac-only @needs-focus
    Examples: Native folder picker
      | device |
      | macOS  |
