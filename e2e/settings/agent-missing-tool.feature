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

  Scenario Outline: A failed Homebrew install says so once and still offers Homebrew
    Given a <layout> Frame
    And Node.js is not on the Server, but Homebrew is
    And the external Agent installer is held
    When I open Example Agent
    And I install Node.js with Homebrew after reading its command
    Then Example Agent shows Node.js installing in place
    When the external Agent installer reports failure
    Then one toast says Node.js could not be installed and Example Agent still offers Homebrew

    Examples:
      | layout |
      | wide   |
      | phone  |

  Scenario Outline: Without Homebrew, the missing uv links its downloads until Recheck finds it
    Given a <layout> Frame
    And uv is not on the Server, nor Homebrew
    When I open Python Agent
    Then Python Agent needs uv and links its download and Homebrew instead of Install
    When uv is installed outside Argo
    And I recheck the tools
    Then Python Agent offers Install

    Examples:
      | layout |
      | wide   |
      | phone  |

  Scenario Outline: The Agent page looks for the tools again when the App comes back
    Given a <layout> Frame
    And uv is not on the Server, nor Homebrew
    When I open Python Agent
    Then Python Agent needs uv and links its download and Homebrew instead of Install
    When uv is installed outside Argo
    And the App goes to the background and comes back
    Then Python Agent offers Install

    Examples:
      | layout |
      | wide   |
      | phone  |
