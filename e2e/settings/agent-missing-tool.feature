Feature: Tools an Agent installs with
  Scenario Outline: Without Node.js, the Agent says so until Recheck finds it
    Given a <layout> Frame
    And Node.js is not on the Server
    When I open Example Agent
    Then Example Agent needs Node.js because npx is missing, instead of Install
    When Node.js is installed outside Argo
    And I recheck the tools
    Then the Agent offers Install

    Examples:
      | layout |
      | wide   |
      | phone  |

  Scenario Outline: The Agent page looks for the tools again when the App comes back
    Given a <layout> Frame
    And uv is not on the Server
    When I open Python Agent
    Then Python Agent needs uv because uvx is missing, instead of Install
    When uv is installed outside Argo
    And the App goes to the background and comes back
    Then the Agent offers Install

    Examples:
      | layout |
      | wide   |
      | phone  |
