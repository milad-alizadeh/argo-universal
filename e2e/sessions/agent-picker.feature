Feature: New Session Agent picker
  Scenario Outline: Add a new agent opens the Agents not yet installed in a <layout> Frame
    Given a <layout> Frame
    When I choose Add a new agent in New Session
    Then the Agents page lists only the Agents not yet installed

    Examples:
      | layout |
      | wide   |
      | phone  |

  Scenario Outline: Agent <agent> leaves the picker when it is <state>
    Given a phone Frame
    And Agent <agent> is "<state>"
    When I open a New Session
    Then the Agent picker offers only Agent <offered> and Add a new agent

    Examples:
      | agent | state          | offered |
      | 1     | not installed  | 2       |
      | 2     | sign-in needed | 1       |
      | 1     | can't start    | 2       |

  Scenario: A disabled Agent leaves the picker and stays in Settings › Agents
    Given a wide Frame
    And Agent 1 is disabled
    When I open a New Session
    Then the Agent picker offers only Agent 2 and Add a new agent
    And the Agents page still lists Agent 1

  Scenario Outline: With every Agent <state>, New Session offers no Agent
    Given a phone Frame
    And every Agent is "<state>"
    When I open a New Session
    Then New Session cannot send a prompt
    And New Session offers no Agent to pick

    Examples:
      | state          |
      | not installed  |
      | sign-in needed |
      | can't start    |

  Scenario: New Session opens at once while an Agent is still being checked
    Given a phone Frame
    And Agent 2 is still being checked
    When I open a New Session
    Then the Agent picker shows Agent 2 checking and Agent 1 ready

  Scenario Outline: A stale Ready Agent that refuses a Session says why and leaves the picker in a <layout> Frame
    Given a <layout> Frame
    And Agent 2 refuses to open a Session
    When I open a New Session
    And I pick Agent 2
    Then one toast says the Session couldn't open because "The Agent refused the Session."
    And the Agent picker offers only Agent 1 and Add a new agent

    Examples:
      | layout |
      | wide   |
      | phone  |
