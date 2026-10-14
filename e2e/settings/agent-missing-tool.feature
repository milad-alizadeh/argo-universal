Feature: Tools an Agent installs with
  Scenario Outline: Homebrew installs the missing Node.js, then the Agent offers Install
    Given a <layout> Frame
    And Node.js is not on the Server, but Homebrew is
    When I open Example Agent
    Then Example Agent needs Node.js and offers it from Homebrew instead of Install
    When I install Node.js with Homebrew after reading its command
    Then one toast says Node.js is installed and Example Agent offers Install

    Examples:
      | layout |
      | wide   |
      | phone  |

  Scenario Outline: Without Homebrew, the missing uv links its download page until it is found
    Given a <layout> Frame
    And uv is not on the Server, nor Homebrew
    When I open Python Agent
    Then Python Agent needs uv and links its download page instead of Install
    When uv is installed outside Argo
    And the window regains focus
    Then Python Agent offers Install

    Examples:
      | layout |
      | wide   |
      | phone  |
