Feature: Agent Readiness
  Scenario Outline: An Agent that is not Ready says why and offers its one action
    Given a <layout> Frame
    And Agent 1 is "<state>"
    When I open Agent 1 from the Agents list
    Then the Agent page shows "<headline>" with "<action>"
    And Agent 1 shows its "<state>" reason without any credential

    Examples:
      | layout | state          | headline      | action  |
      | wide   | sign-in needed | Not signed in | Sign in |
      | phone  | sign-in needed | Not signed in | Sign in |
      | wide   | can't start    | Can’t start   | Recheck |
      | phone  | can't start    | Can’t start   | Recheck |
