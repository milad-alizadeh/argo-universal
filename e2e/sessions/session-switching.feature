Feature: Session switching
  Scenario: Opening another Session shows its own draft
    Given a wide Frame
    And Sessions named "Plan the release" and "Fix the login test"
    And the draft "Ship on Friday" in the Session "Plan the release"
    And the draft "Retry the flaky step" in the Session "Fix the login test"
    When I open the Session "Plan the release"
    Then the Feed shows "Plan the release" instead of "Fix the login test"
    And the Message box shows "Ship on Friday"

  Scenario: Returning to a Session leaves its Agent and model closed
    Given a Session named "Plan the release"
    And I left an open Agent and model for Settings
    When I return to the Session "Plan the release"
    Then no Agent and model overlay is shown

  Scenario: Returning from Settings shows a Session's draft
    Given a Session named "Plan the release"
    And the draft "Ship on Friday" in the Session "Plan the release"
    And I left an open Agent and model for Settings
    When I return to the Session "Plan the release"
    Then the Message box shows "Ship on Friday"

  Scenario Outline: Each Session keeps its Workbench visibility
    Given a wide Frame
    And Sessions named "<first>" and "<second>"
    When I open the Session "<first>"
    And I hide the Workbench
    And I open the Session "<second>"
    Then the Workbench is shown
    When I open the Session "<first>"
    Then the Workbench is hidden

    Examples:
      | first            | second             |
      | Plan the release | Fix the login test |

  Scenario Outline: A recently visited Session keeps its Feed mounted
    Given a wide Frame
    And Sessions named "<first>" and "<second>"
    When I open the Session "<first>"
    And I remember the current Feed
    And I open the Session "<second>"
    Then the remembered Feed remains mounted and hidden
    When I open the Session "<first>"
    Then the remembered Feed is shown

    Examples:
      | first            | second             |
      | Plan the release | Fix the login test |

  @web-only
  Scenario Outline: A Session restores its reading place after its Feed cache expires
    Given the browser clock can advance for Feed expiration
    And a wide Frame
    And Agent 1 supplies a long Feed history
    And a New Session with Agent 1
    When I send the prompt "<prompt>"
    And I reopen the stored long Feed
    And I scroll the Feed to its oldest message
    And I remember the oldest Feed message's position
    And I create three other Sessions
    And the Feed cache expires
    And I return to the long Feed
    Then the oldest Feed message returns to its remembered position

    Examples:
      | prompt               |
      | Build a long history |
