Feature: Agents already on this Mac
  Scenario Outline: An Agent installed outside Argo shows as installed
    Given a <layout> Frame
    And Path Agent is installed on this Mac outside Argo
    When I browse available Agents
    Then Path Agent is Ready and Found on this Mac without an install

    Examples:
      | layout |
      | wide   |
      | phone  |

  Scenario Outline: An Agent Homebrew installed is updated and removed by Homebrew, not Argo
    Given a <layout> Frame
    And Path Agent 1.0.0 was installed with Homebrew
    When I open Path Agent
    Then Path Agent is installed with Homebrew and offers Disable instead of Remove
    When I ask to update Path Agent
    Then Argo shows the Homebrew command to run myself and runs nothing

    Examples:
      | layout |
      | wide   |
      | phone  |
