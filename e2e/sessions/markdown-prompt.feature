Feature: Markdown typed in the Composer
  Scenario: A prompt typed with markdown shortcuts shows as markdown in the Feed
    Given a wide Frame
    And a New Session with Agent 1
    When I type "_Plan_ the release " in the Message box
    And I type "today" in bold with the keyboard shortcut
    And I send the typed prompt with Return
    Then the Session Feed contains the text prompt "_Plan_ the release **today**"
    And the Feed shows the prompt "Plan the release today" without its markers
