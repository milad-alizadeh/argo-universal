Feature: Agent Readiness
  Scenario Outline: A newly installed Agent is checked, then Ready
    Given a <layout> Frame
    And the external Agent installer is held
    When I confirm installing Example Agent
    And the external Agent installer completes
    Then Example Agent is Ready on its page and in the Agents list

    Examples:
      | layout |
      | wide   |
      | phone  |

  Scenario Outline: An Agent that is not Ready says why and offers its one action
    Given a <layout> Frame
    And Agent 1 is "<state>"
    When I open Agent 1 from the Agents list
    Then the Agent page shows "<headline>" with "<action>"
    And no credential appears in Agent 1's reason

    Examples:
      | layout | state          | headline      | action  |
      | wide   | sign-in needed | Not signed in | Sign in |
      | phone  | sign-in needed | Not signed in | Sign in |
      | wide   | can't start    | Can’t start   | Recheck |
      | phone  | can't start    | Can’t start   | Recheck |
